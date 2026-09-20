#!/usr/bin/env python3
"""Generate original, deterministic Học Vui audio assets without network access.

The generator intentionally keeps the catalog as the inventory and prompt source.
It writes only the audio worker write-set:

  design/audio/candidates/{sfx,beds}/
  design/audio/masters/{sfx,beds}/
  design/audio/provenance/asset-generation.jsonl

The synthesis is deliberately layered: short material/noise transients, damped
harmonics, and shaped tails are combined for one-shots; beds use periodic
textures, restrained melodic layers, and soft stereo decorrelation. It is not a
TTS or AI/provider pipeline.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import platform
import shlex
import shutil
import subprocess
import sys
import wave
from pathlib import Path
from typing import Any, Iterable

import numpy as np


GENERATOR_VERSION = "1.1.0"
SAMPLE_RATE = 48_000
BIT_DEPTH = 24
BASE_SEED = 20260918
TAU = 2.0 * math.pi
PCM24_MAX = float((1 << 23) - 1)
ORGANIC_PROFILE = "organic-v2"
ORGANIC_LAYER_NAMES = frozenset(
    {
        "air",
        "brush",
        "contact",
        "felt",
        "paper",
        "percussion",
        "pressure",
        "resonance",
        "room",
    }
)
ORGANIC_PROMPT_PREFIX = (
    "Create one original organic-modern audio asset for a warm illustrated "
    "primary-school learning game. Build the sound from tactile material "
    "contact, softly inharmonic resonance, restrained air, and a small dry "
    "room. The identity must feel contemporary and natural under repeated "
    "listening, never like 8-bit or a 1990s game. No vocals, speech, breath "
    "close to the ear, copyrighted melody, branded notification, harsh attack, "
    "punitive buzzer, metallic glitter, exaggerated bass, or dramatic rise. "
    "This is a local deterministic procedural synthesis reference, not a claim "
    "of recorded foley."
)

ORGANIC_CUE_PROMPTS = {
    "ui-tap": (
        "Tiny rounded wood-and-felt contact: one intimate touch, almost no "
        "defined pitch, soft body from 15–45 ms, clean tail by 100 ms."
    ),
    "answer-correct": (
        "Two calm tactile confirmation gestures, each a felted resonant bloom "
        "with a small natural room return. Friendly smile, not a three-note "
        "ascending jingle or jackpot."
    ),
    "answer-retry": (
        "A soft paper-and-cloth brush settling into one quiet rounded resonance. "
        "Patient invitation to look again; lower energy than correct and never "
        "a failure verdict."
    ),
    "stamp-press": (
        "Padded rubber stamp on thick paper: handle pressure, cushioned contact, "
        "paper release, and a small wooden body. Tactile weight without slam or "
        "cartoon boing."
    ),
    "pet-fox": (
        "A tiny friendly fox personality expressed without an animal recording: "
        "soft felt brush, two nimble rounded resonances, and a light airy landing. "
        "Curious and quick, never squeaky or hyperactive."
    ),
    "music-home": (
        "A sparse 48-second stereo storybook bed: evolving warm air, irregular "
        "wood/felt gestures, tiny brushed texture, and open space. No periodic "
        "harmonic pad, obvious arpeggio, final cadence, or bar-line signalling."
    ),
}

PILOT_IDS = {
    "ui-tap",
    "answer-correct",
    "answer-retry",
    "stamp-press",
    "pet-fox",
    "music-home",
}

# The plan calls out these events for runtime verification before mapping. The
# assets are still generated as offline review material, but provenance keeps
# the integration status explicit.
DEFERRED_IDS = {
    "class-milestone": "plan requires class event verification before mapping",
    "landmark-open": "plan requires landmark event verification before mapping",
    "item-unlock": "plan requires item-unlock event verification before mapping",
    "ambience-evening": "pet-rest state requires runtime verification before mapping",
}

BUS_DIRECTORY = {
    "sfx": "sfx",
    "notification": "sfx",
    "pet": "sfx",
    "music": "beds",
    "ambience": "beds",
}

# Per-bus headroom targets, not loudness or hearing-safety claims.
TARGET_PEAK_DB = {
    "sfx": -8.0,
    "notification": -12.0,
    "pet": -10.0,
    "music": -20.0,
    "ambience": -26.0,
}

# Kept separate from catalog metadata so that the catalog remains unchanged.
PITCH_HZ = {
    "D4": 293.664768,
    "E4": 329.627557,
    "F#4": 369.994423,
    "A4": 440.0,
    "B4": 493.883301,
    "D5": 587.329536,
    "E5": 659.255114,
    "F#5": 739.988845,
    "A5": 880.0,
    "B5": 987.766603,
}


def db_to_linear(db: float) -> float:
    return 10.0 ** (db / 20.0)


def stable_seed(base_seed: int, cue_id: str, variant: int, candidate: str) -> int:
    """Return a deterministic uint32 seed without relying on Python hash randomisation."""

    payload = f"{base_seed}|{cue_id}|{variant:02d}|{candidate}".encode("utf-8")
    digest = hashlib.sha256(payload).digest()
    return int.from_bytes(digest[:4], "little")


def load_catalog(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        catalog = json.load(handle)

    cues = catalog.get("cues")
    if not isinstance(cues, list) or not cues:
        raise ValueError("catalog must contain a non-empty cues array")
    ids = [cue.get("id") for cue in cues]
    if any(not isinstance(cue_id, str) or not cue_id for cue_id in ids):
        raise ValueError("every catalog cue needs a non-empty id")
    if len(set(ids)) != len(ids):
        raise ValueError("catalog contains duplicate cue IDs")
    target_variants = sum(int(cue["variants"]) for cue in cues)
    if len(cues) != 38 or target_variants != 67:
        raise ValueError(
            f"expected 38 cues/67 variants, found {len(cues)} cues/{target_variants} variants"
        )
    for cue in cues:
        if cue.get("bus") not in BUS_DIRECTORY:
            raise ValueError(f"unsupported bus for {cue['id']}: {cue.get('bus')}")
        if float(cue.get("durationSeconds", 0)) <= 0:
            raise ValueError(f"cue {cue['id']} must have positive durationSeconds")
        if int(cue.get("variants", 0)) < 1:
            raise ValueError(f"cue {cue['id']} must have at least one variant")
    return catalog


def _timebase(length: int) -> np.ndarray:
    return np.arange(length, dtype=np.float64) / SAMPLE_RATE


def _exp_envelope(length: int, attack: float, decay: float, sustain: float = 0.0) -> np.ndarray:
    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    attack_n = max(1, min(length, int(round(attack * SAMPLE_RATE))))
    env = np.empty(length, dtype=np.float64)
    env[:attack_n] = np.linspace(0.0, 1.0, attack_n, endpoint=False)
    remaining = length - attack_n
    if remaining:
        decay_scale = max(1.0, decay * SAMPLE_RATE)
        tail = np.exp(-np.arange(remaining, dtype=np.float64) / decay_scale)
        env[attack_n:] = sustain + (1.0 - sustain) * tail
    return env


def _gaussian_envelope(length: int, center: float, width: float) -> np.ndarray:
    t = _timebase(length)
    return np.exp(-0.5 * ((t - center) / max(width, 1.0 / SAMPLE_RATE)) ** 2)


def _soft_noise(length: int, rng: np.random.Generator, control_step: int = 384) -> np.ndarray:
    """Create a smooth, non-loop-critical noise texture with no scipy dependency."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    step = max(8, control_step)
    count = max(3, int(math.ceil(length / step)) + 2)
    controls = rng.normal(0.0, 1.0, count)
    xp = np.linspace(0.0, float(length - 1), count)
    return np.interp(np.arange(length, dtype=np.float64), xp, controls)


def _periodic_texture(length: int, rng: np.random.Generator, harmonics: int = 24) -> np.ndarray:
    """Low-level periodic texture; phase wraps at the bed boundary by construction."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    phase = np.arange(length, dtype=np.float64) / float(length)
    texture = np.zeros(length, dtype=np.float64)
    for harmonic in range(1, harmonics + 1):
        amplitude = float(rng.uniform(-1.0, 1.0)) / math.sqrt(harmonic)
        texture += amplitude * np.sin(TAU * harmonic * phase + rng.uniform(0.0, TAU))
    peak = float(np.max(np.abs(texture))) or 1.0
    return texture / peak


def _circular_smooth(signal: np.ndarray, radius: int = 3) -> np.ndarray:
    """Remove a possible single-sample loop edge discontinuity without a fade-out."""

    if len(signal) < 3 or radius <= 0:
        return signal
    weights = np.array([1.0, 2.0, 3.0, 2.0, 1.0], dtype=np.float64)
    weights /= np.sum(weights)
    result = np.zeros_like(signal)
    for offset, weight in zip(range(-radius, radius + 1), weights):
        result += weight * np.roll(signal, offset)
    return result


def _add_at(buffer: np.ndarray, start_seconds: float, signal: np.ndarray, gain: float = 1.0) -> None:
    start = max(0, int(round(start_seconds * SAMPLE_RATE)))
    if start >= len(buffer) or len(signal) == 0:
        return
    end = min(len(buffer), start + len(signal))
    buffer[start:end] += gain * signal[: end - start]


def _wood_tone(
    frequency: float,
    length: int,
    rng: np.random.Generator,
    brightness: float = 0.5,
    decay: float = 0.18,
) -> np.ndarray:
    """Damped, multi-partial pluck with a small material exciter."""

    t = _timebase(length)
    detune = 1.0 + float(rng.uniform(-0.0025, 0.0025))
    phase = rng.uniform(0.0, TAU)
    fundamental = np.sin(TAU * frequency * detune * t + phase)
    second = np.sin(TAU * frequency * 2.01 * t + phase * 0.73)
    third = np.sin(TAU * frequency * 3.02 * t + phase * 1.31)
    fourth = np.sin(TAU * frequency * 4.04 * t + phase * 0.41)
    harmonic_mix = fundamental + 0.34 * second + (0.12 + 0.18 * brightness) * third
    harmonic_mix += (0.025 + 0.08 * brightness) * fourth
    env = _exp_envelope(length, attack=0.002 + 0.002 * (1.0 - brightness), decay=decay)
    exciter = rng.normal(0.0, 1.0, length)
    exciter_env = _exp_envelope(length, attack=0.0005, decay=0.018)
    body = _soft_noise(length, rng, control_step=max(32, int(SAMPLE_RATE / 1000)))
    return 0.82 * harmonic_mix * env + 0.07 * exciter * exciter_env + 0.055 * body * env


def _air_tone(
    frequency: float,
    length: int,
    rng: np.random.Generator,
    decay: float = 0.22,
    vibrato: float = 2.4,
) -> np.ndarray:
    """Quiet flute-like harmonic halo without breath or voice synthesis."""

    t = _timebase(length)
    vibrato_phase = 0.018 * np.sin(TAU * vibrato * t + rng.uniform(0.0, TAU))
    phase = TAU * frequency * t + vibrato_phase
    tone = np.sin(phase) + 0.16 * np.sin(2.01 * phase + 0.2) + 0.045 * np.sin(3.02 * phase)
    env = _exp_envelope(length, attack=0.016, decay=decay)
    air = _soft_noise(length, rng, control_step=480)
    return 0.34 * tone * env + 0.035 * air * env


def _shaped_noise(
    length: int,
    rng: np.random.Generator,
    attack: float,
    release: float,
    level: float = 1.0,
    control_step: int = 256,
) -> np.ndarray:
    raw = 0.72 * rng.normal(0.0, 1.0, length) + 0.28 * _soft_noise(length, rng, control_step)
    env = _exp_envelope(length, attack=attack, decay=max(0.001, release), sustain=0.0)
    return level * raw * env


def _one_pole_lowpass(signal: np.ndarray, cutoff_hz: float) -> np.ndarray:
    """Small dependency-free low-pass used only for short material layers."""

    if len(signal) == 0:
        return np.zeros(0, dtype=np.float64)
    cutoff = max(20.0, min(float(cutoff_hz), SAMPLE_RATE * 0.45))
    alpha = 1.0 - math.exp(-TAU * cutoff / SAMPLE_RATE)
    output = np.empty_like(signal, dtype=np.float64)
    previous = 0.0
    for index, value in enumerate(signal):
        previous += alpha * (float(value) - previous)
        output[index] = previous
    return output


def _organic_contact(
    length: int,
    rng: np.random.Generator,
    *,
    material: str,
    attack: float = 0.0005,
    release: float = 0.055,
    level: float = 1.0,
) -> np.ndarray:
    """Filtered contact noise with material-specific body, not a click."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    raw = rng.normal(0.0, 1.0, length)
    soft = _soft_noise(length, rng, control_step=max(24, int(SAMPLE_RATE / 900)))
    low = _one_pole_lowpass(raw, {"wood": 2400.0, "felt": 1700.0, "rubber": 1200.0, "paper": 5200.0}.get(material, 2200.0))
    high = raw - _one_pole_lowpass(raw, 7200.0)
    material_mix = {
        "wood": 0.34 * low + 0.12 * high + 0.30 * soft,
        "felt": 0.26 * low + 0.06 * high + 0.42 * soft,
        "rubber": 0.46 * low + 0.05 * high + 0.18 * soft,
        "paper": 0.12 * low + 0.34 * high + 0.32 * soft,
    }.get(material, 0.24 * low + 0.16 * high + 0.28 * soft)
    envelope = _exp_envelope(length, attack=attack, decay=release)
    return level * np.tanh(material_mix * 1.35) * envelope


def _organic_modal(
    frequency: float,
    length: int,
    rng: np.random.Generator,
    *,
    decay: float,
    level: float = 1.0,
) -> np.ndarray:
    """Softly inharmonic resonant body excited by a noisy contact."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    t = _timebase(length)
    phase_seed = rng.uniform(0.0, TAU)
    drift = 0.004 * _soft_noise(length, rng, control_step=max(48, int(SAMPLE_RATE / 180)))
    phase_wobble = 0.018 * np.sin(TAU * rng.uniform(1.1, 2.3) * t + phase_seed)
    ratios = np.array([0.93, 1.0, 1.47, 2.08, 2.83], dtype=np.float64)
    weights = np.array([0.24, 0.72, 0.28, 0.13, 0.065], dtype=np.float64)
    weights *= rng.uniform(0.88, 1.12, size=len(weights))
    resonance = np.zeros(length, dtype=np.float64)
    for ratio, weight in zip(ratios, weights):
        local_frequency = frequency * ratio * (1.0 + float(rng.uniform(-0.012, 0.012)))
        phase = TAU * local_frequency * t + phase_wobble + drift * TAU * local_frequency * t + phase_seed * ratio
        resonance += weight * np.sin(phase)
    envelope = _exp_envelope(length, attack=0.0015, decay=max(0.025, decay))
    contact = _organic_contact(length, rng, material="wood", attack=0.0002, release=0.018, level=0.28)
    return level * np.tanh((resonance * envelope) + contact) * 0.72


def _organic_brush(
    length: int,
    rng: np.random.Generator,
    *,
    material: str = "felt",
    level: float = 1.0,
) -> np.ndarray:
    """Short non-periodic paper/felt movement with a natural gesture envelope."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    t = _timebase(length)
    control = _soft_noise(length, rng, control_step=max(32, int(SAMPLE_RATE / 120)))
    control /= max(float(np.max(np.abs(control))), 1.0)
    raw = rng.normal(0.0, 1.0, length)
    low = _one_pole_lowpass(raw, 1800.0 if material == "felt" else 3200.0)
    high = raw - low
    movement = 0.32 + 0.68 * np.abs(control)
    envelope = np.exp(-t / max(0.028, length / SAMPLE_RATE / 2.35))
    texture = (0.34 * low + (0.10 if material == "felt" else 0.22) * high + 0.20 * control)
    return level * np.tanh(texture * 1.4) * movement * envelope


def _add_organic_room(
    buffer: np.ndarray,
    start: float,
    signal: np.ndarray,
    gain: float,
    *,
    spread: float = 0.0,
) -> None:
    """Add a very short diffuse reflection pair without a long reverb tail."""

    _add_at(buffer, start + 0.022, signal, gain * 0.075)
    _add_at(buffer, start + 0.047, signal, gain * (0.045 + spread * 0.02))


def _organic_air_bed(length: int, rng: np.random.Generator) -> np.ndarray:
    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    control = _soft_noise(length, rng, control_step=max(256, int(SAMPLE_RATE * 0.7)))
    control /= max(float(np.max(np.abs(control))), 1.0)
    fine = rng.normal(0.0, 1.0, length)
    fine *= 0.035 + 0.025 * (0.5 + 0.5 * control)
    return 0.11 * control + fine


def _organic_one_shot(cue_id: str, duration: float, rng: np.random.Generator) -> tuple[np.ndarray, list[str]]:
    n = max(1, int(round(duration * SAMPLE_RATE)))
    signal = np.zeros(n, dtype=np.float64)
    layers: set[str] = set()

    def add(component: np.ndarray, start: float, gain: float, layer: str, room: bool = False) -> None:
        _add_at(signal, start, component, gain)
        layers.add(layer)
        if room:
            _add_organic_room(signal, start, component, gain)
            layers.add("room")

    if cue_id == "ui-tap":
        contact = _organic_contact(min(n, int(0.055 * SAMPLE_RATE)), rng, material="wood", release=0.035, level=1.0)
        add(contact, 0.0, 0.95, "contact", room=True)
        add(_organic_contact(min(n, int(0.04 * SAMPLE_RATE)), rng, material="felt", release=0.024, level=0.8), 0.006, 0.34, "felt")
        add(_organic_modal(330.0, min(n, int(0.08 * SAMPLE_RATE)), rng, decay=0.045), 0.008, 0.27, "resonance")
    elif cue_id == "answer-correct":
        for start, frequency, gain in ((0.0, PITCH_HZ["D5"] * 0.96, 0.52), (0.205, PITCH_HZ["A5"] * 0.985, 0.42)):
            body = _organic_modal(frequency, min(n, int(0.36 * SAMPLE_RATE)), rng, decay=0.19)
            add(body, start, gain, "resonance", room=True)
            add(_organic_contact(min(n, int(0.036 * SAMPLE_RATE)), rng, material="felt", release=0.020), start, 0.24, "felt")
    elif cue_id == "answer-retry":
        add(_organic_brush(min(n, int(0.19 * SAMPLE_RATE)), rng, material="paper"), 0.0, 0.60, "paper", room=True)
        add(_organic_contact(min(n, int(0.055 * SAMPLE_RATE)), rng, material="felt", release=0.035), 0.075, 0.26, "felt")
        add(_organic_modal(PITCH_HZ["D4"] * 1.08, min(n, int(0.18 * SAMPLE_RATE)), rng, decay=0.095), 0.145, 0.18, "resonance")
    elif cue_id == "stamp-press":
        add(_organic_contact(min(n, int(0.12 * SAMPLE_RATE)), rng, material="wood", release=0.08), 0.0, 0.36, "pressure")
        add(_organic_contact(min(n, int(0.095 * SAMPLE_RATE)), rng, material="rubber", release=0.055), 0.13, 0.92, "contact", room=True)
        add(_organic_brush(min(n, int(0.16 * SAMPLE_RATE)), rng, material="paper"), 0.23, 0.34, "paper")
        add(_organic_modal(180.0, min(n, int(0.30 * SAMPLE_RATE)), rng, decay=0.13), 0.13, 0.20, "resonance")
    elif cue_id == "pet-fox":
        add(_organic_brush(min(n, int(0.15 * SAMPLE_RATE)), rng, material="felt"), 0.0, 0.45, "felt", room=True)
        add(_organic_modal(PITCH_HZ["E5"] * 0.92, min(n, int(0.23 * SAMPLE_RATE)), rng, decay=0.11), 0.08, 0.34, "resonance")
        add(_organic_modal(PITCH_HZ["A5"] * 0.91, min(n, int(0.22 * SAMPLE_RATE)), rng, decay=0.10), 0.235, 0.28, "resonance")
        add(_organic_air_bed(min(n, int(0.16 * SAMPLE_RATE)), rng), 0.36, 0.13, "air")
    else:
        # The organic pilot's only loop is music-home; keep this fallback
        # material-first for defensive future use without creating a beep.
        add(_organic_contact(min(n, int(0.08 * SAMPLE_RATE)), rng, material="felt", release=0.05), 0.0, 0.35, "contact", room=True)
        add(_organic_modal(PITCH_HZ["D5"], min(n, int(0.28 * SAMPLE_RATE)), rng, decay=0.14), 0.04, 0.24, "resonance")

    signal = np.tanh(signal * 1.25)
    signal -= float(np.mean(signal)) * 0.04
    return signal, sorted(layers)


def _organic_music(duration: float, rng: np.random.Generator) -> tuple[np.ndarray, list[str]]:
    n = max(1, int(round(duration * SAMPLE_RATE)))
    stereo = np.zeros((n, 2), dtype=np.float64)
    layers: set[str] = {"air", "room", "resonance", "brush"}
    left_air = _organic_air_bed(n, rng)
    right_air = _organic_air_bed(n, rng)
    stereo[:, 0] += left_air * 0.22
    stereo[:, 1] += right_air * 0.22

    gesture_times = np.array([0.9, 5.6, 10.8, 16.9, 23.7, 30.6, 37.9, 44.5], dtype=np.float64)
    gesture_times += rng.uniform(-0.28, 0.28, size=len(gesture_times))
    frequencies = [PITCH_HZ["D5"], PITCH_HZ["E5"], PITCH_HZ["F#5"], PITCH_HZ["A4"], PITCH_HZ["B4"]]
    for index, start in enumerate(gesture_times):
        if start >= duration:
            continue
        length = int(rng.uniform(0.24, 0.62) * SAMPLE_RATE)
        body = _organic_modal(frequencies[index % len(frequencies)] * rng.uniform(0.92, 1.04), length, rng, decay=0.24, level=0.85)
        spread = 0.025 + 0.025 * (index % 2)
        _stereo_add(stereo, float(start), body, 0.14, spread=spread)
        brush = _organic_brush(int(min(0.30, max(0.12, length / SAMPLE_RATE * 0.55)) * SAMPLE_RATE), rng, material="felt", level=0.75)
        _stereo_add(stereo, float(start + 0.035), brush, 0.055, spread=spread * 0.6)

    for start in (3.1, 13.8, 27.1, 41.4):
        if start < duration:
            percussion = _organic_contact(int(0.07 * SAMPLE_RATE), rng, material="felt", release=0.05, level=0.8)
            _stereo_add(stereo, start, percussion, 0.035, spread=0.015)
            layers.add("percussion")

    stereo[:, 0] = np.tanh(stereo[:, 0] * 1.15)
    stereo[:, 1] = np.tanh(stereo[:, 1] * 1.15)
    stereo -= np.mean(stereo, axis=0, keepdims=True) * 0.02
    return stereo, sorted(layers)


def synthesize_organic(cue: dict[str, Any], rng: np.random.Generator) -> tuple[np.ndarray, list[str]]:
    """Render one organic-v2 cue and report its material layers."""

    cue_id = str(cue["id"])
    duration = float(cue["durationSeconds"])
    if bool(cue.get("loop")) and cue.get("bus") == "music":
        return _organic_music(duration, rng)
    return _organic_one_shot(cue_id, duration, rng)


def _brush(length: int, rng: np.random.Generator, level: float = 1.0) -> np.ndarray:
    """Short paper/cloth brush: noisy but shaped and intentionally non-tonal."""

    if length <= 0:
        return np.zeros(0, dtype=np.float64)
    t = _timebase(length)
    motion = np.sin(TAU * (1.4 + rng.uniform(-0.2, 0.2)) * t) ** 2
    envelope = np.exp(-t / max(0.025, length / SAMPLE_RATE / 2.5))
    raw = 0.65 * rng.normal(0.0, 1.0, length) + 0.35 * _soft_noise(length, rng, 220)
    return level * raw * (0.2 + 0.8 * motion) * envelope


def _thup(length: int, rng: np.random.Generator, frequency: float = 145.0, level: float = 1.0) -> np.ndarray:
    """Soft wood/rubber impact with a low body and a muted contact transient."""

    t = _timebase(length)
    body = np.sin(TAU * frequency * t + rng.uniform(0.0, TAU))
    body += 0.32 * np.sin(TAU * frequency * 1.73 * t)
    body *= _exp_envelope(length, attack=0.0015, decay=0.045)
    contact = rng.normal(0.0, 1.0, length) * _exp_envelope(length, attack=0.0002, decay=0.007)
    return level * (0.78 * body + 0.11 * contact)


def _paper_landing(length: int, rng: np.random.Generator, level: float = 1.0) -> np.ndarray:
    t = _timebase(length)
    flutter = _shaped_noise(length, rng, attack=0.001, release=0.045, level=0.7, control_step=96)
    flutter *= 0.45 + 0.55 * np.abs(np.sin(TAU * 18.0 * t + rng.uniform(0.0, TAU)))
    return level * flutter


def _chirp(length: int, rng: np.random.Generator, start_hz: float, end_hz: float, level: float) -> np.ndarray:
    t = _timebase(length)
    duration = max(length / SAMPLE_RATE, 1.0 / SAMPLE_RATE)
    phase = TAU * (start_hz * t + 0.5 * (end_hz - start_hz) * (t * t / duration))
    env = _exp_envelope(length, attack=0.004, decay=0.075)
    body = np.sin(phase) + 0.17 * np.sin(2.01 * phase + 0.3)
    return level * body * env + 0.025 * _soft_noise(length, rng, 160) * env


def _add_wood(buffer: np.ndarray, start: float, pitch: str, duration: float, amp: float, rng: np.random.Generator, brightness: float = 0.5) -> None:
    _add_at(buffer, start, _wood_tone(PITCH_HZ[pitch], max(1, int(round(duration * SAMPLE_RATE))), rng, brightness=brightness, decay=max(0.045, duration * 0.55)), amp)


def _add_air(buffer: np.ndarray, start: float, pitch: str, duration: float, amp: float, rng: np.random.Generator) -> None:
    _add_at(buffer, start, _air_tone(PITCH_HZ[pitch], max(1, int(round(duration * SAMPLE_RATE))), rng, decay=max(0.08, duration * 0.55)), amp)


def _add_brush(buffer: np.ndarray, start: float, duration: float, amp: float, rng: np.random.Generator) -> None:
    _add_at(buffer, start, _brush(max(1, int(round(duration * SAMPLE_RATE))), rng, level=1.0), amp)


def _add_thup(buffer: np.ndarray, start: float, duration: float, amp: float, rng: np.random.Generator, frequency: float = 145.0) -> None:
    _add_at(buffer, start, _thup(max(1, int(round(duration * SAMPLE_RATE))), rng, frequency=frequency, level=1.0), amp)


def _synthesize_one_shot(cue_id: str, duration: float, rng: np.random.Generator) -> np.ndarray:
    n = max(1, int(round(duration * SAMPLE_RATE)))
    signal = np.zeros(n, dtype=np.float64)

    if cue_id == "ui-tap":
        _add_wood(signal, 0.000, "A4", min(duration, 0.09), 0.95, rng, brightness=0.34)
        _add_thup(signal, 0.002, min(duration, 0.045), 0.16, rng, frequency=220.0)
    elif cue_id == "ui-confirm":
        _add_wood(signal, 0.000, "D5", 0.16, 0.66, rng, brightness=0.34)
        _add_wood(signal, 0.085, "A5", 0.16, 0.48, rng, brightness=0.28)
    elif cue_id == "ui-back":
        _add_brush(signal, 0.000, 0.095, 0.40, rng)
        _add_thup(signal, 0.075, 0.075, 0.35, rng, frequency=185.0)
    elif cue_id == "page-turn":
        _add_brush(signal, 0.000, 0.16, 0.48, rng)
        _add_brush(signal, 0.085, 0.18, 0.31, rng)
        _add_at(signal, 0.25, _paper_landing(min(n, int(0.13 * SAMPLE_RATE)), rng, 1.0), 0.24)
    elif cue_id == "map-unfold":
        _add_brush(signal, 0.000, 0.25, 0.42, rng)
        _add_brush(signal, 0.29, 0.22, 0.31, rng)
        _add_air(signal, 0.42, "D5", 0.32, 0.12, rng)
        _add_wood(signal, 0.50, "D5", 0.30, 0.35, rng, brightness=0.4)
    elif cue_id == "map-select":
        _add_thup(signal, 0.000, 0.06, 0.50, rng, frequency=180.0)
        _add_wood(signal, 0.045, "E5", 0.19, 0.27, rng, brightness=0.38)
    elif cue_id == "landmark-open":
        _add_thup(signal, 0.000, 0.075, 0.35, rng, frequency=155.0)
        _add_wood(signal, 0.100, "D5", 0.20, 0.30, rng, brightness=0.30)
        _add_air(signal, 0.255, "E5", 0.24, 0.15, rng)
        _add_wood(signal, 0.260, "E5", 0.18, 0.16, rng, brightness=0.22)
    elif cue_id == "answer-select":
        _add_thup(signal, 0.000, 0.055, 0.43, rng, frequency=190.0)
        _add_wood(signal, 0.005, "D4", 0.105, 0.12, rng, brightness=0.18)
    elif cue_id == "answer-correct":
        _add_wood(signal, 0.000, "D5", 0.30, 0.58, rng, brightness=0.36)
        _add_wood(signal, 0.130, "F#5", 0.30, 0.50, rng, brightness=0.39)
        _add_wood(signal, 0.285, "A5", 0.34, 0.43, rng, brightness=0.32)
        _add_brush(signal, 0.20, 0.16, 0.08, rng)
    elif cue_id == "answer-retry":
        _add_thup(signal, 0.000, 0.065, 0.30, rng, frequency=160.0)
        _add_wood(signal, 0.018, "D4", 0.12, 0.10, rng, brightness=0.20)
        _add_air(signal, 0.140, "E5", 0.18, 0.22, rng)
        _add_wood(signal, 0.140, "E5", 0.15, 0.11, rng, brightness=0.23)
    elif cue_id == "learning-hint":
        _add_wood(signal, 0.000, "D5", 0.22, 0.38, rng, brightness=0.30)
        _add_air(signal, 0.170, "E5", 0.22, 0.21, rng)
        _add_wood(signal, 0.170, "E5", 0.18, 0.14, rng, brightness=0.25)
    elif cue_id == "match-connect":
        _add_thup(signal, 0.000, 0.055, 0.35, rng, frequency=205.0)
        _add_thup(signal, 0.030, 0.085, 0.24, rng, frequency=260.0)
        _add_wood(signal, 0.035, "A4", 0.13, 0.10, rng, brightness=0.2)
    elif cue_id == "lesson-complete":
        for start, pitch, amp in ((0.00, "D5", 0.38), (0.22, "E5", 0.34), (0.45, "F#5", 0.32), (0.68, "A5", 0.29)):
            _add_wood(signal, start, pitch, 0.40, amp, rng, brightness=0.38)
        _add_wood(signal, 0.76, "D4", 0.80, 0.24, rng, brightness=0.25)
        _add_brush(signal, 0.92, 0.22, 0.12, rng)
    elif cue_id == "stamp-press":
        _add_wood(signal, 0.000, "D4", 0.11, 0.18, rng, brightness=0.22)
        _add_wood(signal, 0.050, "A4", 0.11, 0.15, rng, brightness=0.20)
        _add_thup(signal, 0.130, 0.105, 0.72, rng, frequency=105.0)
        _add_at(signal, 0.235, _paper_landing(min(n, int(0.16 * SAMPLE_RATE)), rng, 1.0), 0.25)
        _add_wood(signal, 0.300, "D5", 0.27, 0.18, rng, brightness=0.28)
    elif cue_id == "collection-open":
        _add_thup(signal, 0.000, 0.07, 0.28, rng, frequency=170.0)
        _add_brush(signal, 0.10, 0.20, 0.26, rng)
        _add_wood(signal, 0.30, "A4", 0.25, 0.28, rng, brightness=0.28)
    elif cue_id == "item-unlock":
        _add_brush(signal, 0.000, 0.16, 0.25, rng)
        _add_brush(signal, 0.09, 0.18, 0.16, rng)
        _add_wood(signal, 0.18, "D5", 0.27, 0.29, rng, brightness=0.34)
        _add_wood(signal, 0.35, "E5", 0.27, 0.25, rng, brightness=0.36)
        _add_wood(signal, 0.55, "A5", 0.36, 0.22, rng, brightness=0.30)
    elif cue_id == "challenge-submit":
        _add_brush(signal, 0.000, 0.18, 0.31, rng)
        _add_thup(signal, 0.210, 0.075, 0.28, rng, frequency=165.0)
        _add_wood(signal, 0.270, "E5", 0.21, 0.20, rng, brightness=0.28)
    elif cue_id == "class-milestone":
        _add_wood(signal, 0.00, "D5", 0.42, 0.25, rng, brightness=0.34)
        _add_wood(signal, 0.25, "E5", 0.42, 0.23, rng, brightness=0.34)
        _add_air(signal, 0.50, "F#5", 0.48, 0.16, rng)
        _add_wood(signal, 0.78, "A5", 0.52, 0.20, rng, brightness=0.32)
        _add_brush(signal, 0.98, 0.18, 0.12, rng)
        _add_thup(signal, 1.42, 0.11, 0.12, rng, frequency=135.0)
    elif cue_id == "reaction-positive":
        _add_brush(signal, 0.000, 0.11, 0.28, rng)
        _add_wood(signal, 0.045, "E5", 0.18, 0.24, rng, brightness=0.28)
    elif cue_id == "message-send":
        _add_brush(signal, 0.000, 0.105, 0.23, rng)
        _add_thup(signal, 0.110, 0.050, 0.17, rng, frequency=220.0)
    elif cue_id == "message-receive":
        _add_wood(signal, 0.000, "A4", 0.17, 0.18, rng, brightness=0.25)
        _add_wood(signal, 0.110, "D5", 0.14, 0.12, rng, brightness=0.21)
    elif cue_id == "pet-fox":
        _add_wood(signal, 0.000, "E5", 0.22, 0.36, rng, brightness=0.42)
        _add_wood(signal, 0.155, "A5", 0.24, 0.30, rng, brightness=0.40)
        _add_brush(signal, 0.290, 0.14, 0.12, rng)
        _add_wood(signal, 0.400, "D5", 0.28, 0.24, rng, brightness=0.28)
    elif cue_id == "pet-elephant":
        _add_wood(signal, 0.000, "D4", 0.34, 0.37, rng, brightness=0.22)
        _add_thup(signal, 0.100, 0.10, 0.18, rng, frequency=110.0)
        _add_wood(signal, 0.260, "A4", 0.39, 0.29, rng, brightness=0.20)
    elif cue_id == "pet-owl":
        _add_air(signal, 0.000, "D5", 0.27, 0.25, rng)
        _add_wood(signal, 0.055, "D5", 0.18, 0.10, rng, brightness=0.18)
        _add_air(signal, 0.240, "E5", 0.28, 0.20, rng)
        _add_wood(signal, 0.300, "E5", 0.15, 0.09, rng, brightness=0.18)
    elif cue_id == "pet-dragon":
        _add_wood(signal, 0.000, "D4", 0.38, 0.26, rng, brightness=0.25)
        _add_wood(signal, 0.200, "A4", 0.40, 0.24, rng, brightness=0.28)
        _add_air(signal, 0.400, "D5", 0.35, 0.12, rng)
        _add_wood(signal, 0.420, "D5", 0.39, 0.20, rng, brightness=0.31)
    elif cue_id == "birthday":
        for start, pitch, amp in ((0.00, "D5", 0.24), (0.40, "E5", 0.22), (0.80, "F#5", 0.22), (1.20, "A5", 0.20), (1.65, "B5", 0.18), (2.05, "A5", 0.18), (2.35, "D5", 0.22)):
            _add_wood(signal, start, pitch, 0.42, amp, rng, brightness=0.34)
        _add_air(signal, 1.12, "F#5", 0.48, 0.10, rng)
        _add_thup(signal, 0.68, 0.08, 0.10, rng, frequency=135.0)
        _add_thup(signal, 1.52, 0.08, 0.08, rng, frequency=125.0)
    elif cue_id == "lesson-start":
        _add_brush(signal, 0.000, 0.13, 0.24, rng)
        _add_wood(signal, 0.100, "D5", 0.27, 0.26, rng, brightness=0.28)
        _add_wood(signal, 0.280, "E5", 0.28, 0.22, rng, brightness=0.27)
    elif cue_id == "ui-toggle":
        _add_thup(signal, 0.000, 0.042, 0.27, rng, frequency=175.0)
        _add_wood(signal, 0.006, "D4", 0.070, 0.08, rng, brightness=0.12)
    else:
        # Defensive fallback for future catalog additions: still layered and
        # material-based, never a bare sine/beep.
        _add_thup(signal, 0.000, min(duration, 0.08), 0.25, rng, frequency=160.0)
        _add_wood(signal, 0.020, PITCH_HZ and "D5", min(duration, 0.22), 0.18, rng, brightness=0.25)
        _add_brush(signal, min(0.05, duration / 3.0), min(0.14, duration), 0.08, rng)

    signal -= float(np.mean(signal)) * 0.08
    return signal


def _stereo_add(stereo: np.ndarray, start: float, signal: np.ndarray, gain: float, spread: float = 0.04) -> None:
    start_index = max(0, int(round(start * SAMPLE_RATE)))
    if start_index >= stereo.shape[0] or len(signal) == 0:
        return
    end = min(stereo.shape[0], start_index + len(signal))
    portion = signal[: end - start_index]
    stereo[start_index:end, 0] += gain * (1.0 - spread) * portion
    stereo[start_index:end, 1] += gain * (1.0 + spread) * portion


def _music_events(cue_id: str) -> tuple[float, list[tuple[float, str, float, str]]]:
    if cue_id == "music-home":
        bar, events = 3.0, [
            (0.00, "D5", 0.28, "wood"), (0.55, "E5", 0.20, "wood"), (1.10, "F#5", 0.21, "air"),
            (1.85, "A5", 0.18, "wood"), (3.00, "D5", 0.22, "wood"), (3.65, "F#5", 0.16, "air"),
            (4.70, "E5", 0.18, "wood"), (6.15, "A4", 0.16, "air"), (8.05, "D5", 0.18, "wood"),
            (9.10, "E5", 0.16, "air"), (12.00, "D5", 0.22, "wood"), (12.62, "F#5", 0.18, "wood"),
            (13.65, "A5", 0.15, "air"), (15.00, "E5", 0.17, "wood"),
        ]
    elif cue_id == "music-map":
        bar, events = 3.0, [
            (0.00, "D5", 0.20, "air"), (0.80, "F#5", 0.16, "wood"), (1.55, "A5", 0.14, "air"),
            (3.25, "E5", 0.18, "wood"), (4.20, "A4", 0.14, "air"), (5.65, "D5", 0.16, "wood"),
            (8.00, "F#5", 0.17, "air"), (9.20, "E5", 0.15, "wood"), (10.60, "A4", 0.13, "air"),
            (12.00, "D5", 0.20, "wood"), (13.20, "A5", 0.14, "air"), (15.00, "E5", 0.15, "wood"),
        ]
    elif cue_id == "music-focus":
        bar, events = 53.333 / 16.0, [
            (0.00, "D5", 0.16, "wood"), (2.00, "E5", 0.13, "air"), (4.00, "F#5", 0.12, "wood"),
            (6.00, "A4", 0.10, "air"), (8.00, "D5", 0.14, "wood"), (10.00, "E5", 0.11, "air"),
            (12.00, "F#5", 0.11, "wood"), (14.00, "D5", 0.10, "air"),
        ]
    else:
        bar, events = 43.636 / 16.0, [
            (0.00, "D5", 0.18, "wood"), (0.75, "E5", 0.15, "wood"), (1.55, "A4", 0.13, "air"),
            (4.00, "F#5", 0.16, "wood"), (5.00, "A5", 0.13, "air"), (8.00, "E5", 0.15, "wood"),
            (9.00, "D5", 0.13, "air"), (12.00, "F#5", 0.15, "wood"), (13.25, "A4", 0.12, "air"),
            (15.00, "D5", 0.15, "wood"),
        ]
    return bar, events


def _synthesize_music(cue_id: str, duration: float, rng: np.random.Generator) -> np.ndarray:
    n = max(1, int(round(duration * SAMPLE_RATE)))
    stereo = np.zeros((n, 2), dtype=np.float64)
    # Continuous harmonic bed, kept quiet so the melodic gestures have air.
    t = _timebase(n)
    texture = _periodic_texture(n, rng, harmonics=18)
    slow = 0.5 + 0.5 * np.sin(TAU * t / max(duration, 1.0) + rng.uniform(0.0, TAU))
    pad = 0.024 * texture * (0.62 + 0.38 * slow)
    pad += 0.018 * np.sin(TAU * 293.664768 * t + 0.2)
    pad += 0.011 * np.sin(TAU * 440.0 * t + 1.1)
    stereo[:, 0] += pad * 0.96
    stereo[:, 1] += pad * 1.04

    bar, events = _music_events(cue_id)
    for repetition in range(4):
        for beat_offset, pitch, amp, material in events:
            start = repetition * 4.0 * bar + beat_offset * (bar / 4.0)
            if start >= duration:
                continue
            length = min(0.95, max(0.20, 0.24 * bar))
            if material == "air":
                local = _air_tone(PITCH_HZ[pitch], max(1, int(round(length * SAMPLE_RATE))), rng, decay=length * 0.7)
            else:
                local = _wood_tone(PITCH_HZ[pitch], max(1, int(round(length * SAMPLE_RATE))), rng, brightness=0.30, decay=length * 0.70)
            _stereo_add(stereo, start, local, amp, spread=0.035 if material == "wood" else 0.025)

    # Sparse, soft percussion marks only on selected bars.
    percussion_times = [bar * 1.98, bar * 5.98, bar * 9.98, bar * 13.98]
    for start in percussion_times:
        if start < duration:
            _stereo_add(stereo, start, _thup(int(0.065 * SAMPLE_RATE), rng, frequency=120.0, level=1.0), 0.075, spread=0.015)

    # A tiny pickup before the final bar gives the loop a return gesture without
    # a final cadence. The circular smoothing below is a technical seam aid only.
    pickup_start = max(0.0, duration - bar * 1.05)
    _stereo_add(stereo, pickup_start, _air_tone(PITCH_HZ["D5"], int(0.20 * SAMPLE_RATE), rng, decay=0.13), 0.055, spread=0.02)
    stereo[:, 0] = _circular_smooth(stereo[:, 0])
    stereo[:, 1] = _circular_smooth(stereo[:, 1])
    stereo -= np.mean(stereo, axis=0, keepdims=True) * 0.03
    return stereo


def _synthesize_ambience(cue_id: str, duration: float, rng: np.random.Generator) -> np.ndarray:
    n = max(1, int(round(duration * SAMPLE_RATE)))
    stereo = np.zeros((n, 2), dtype=np.float64)
    t = _timebase(n)
    periodic_air = _periodic_texture(n, rng, harmonics=11)
    slow_breath = 0.5 + 0.5 * np.sin(TAU * t / duration + rng.uniform(0.0, TAU))
    base = 0.045 * periodic_air * (0.72 + 0.28 * slow_breath)
    stereo[:, 0] += base * 0.96
    stereo[:, 1] += base * 1.04

    if cue_id == "ambience-garden":
        leaf = _periodic_texture(n, rng, harmonics=45) * (0.020 + 0.015 * slow_breath)
        stereo[:, 0] += leaf * 0.88
        stereo[:, 1] += leaf * 1.06
        for start, start_hz, end_hz in ((4.1, 1450.0, 1850.0), (12.7, 1270.0, 1600.0), (19.1, 1520.0, 1820.0)):
            _stereo_add(stereo, start, _chirp(int(0.09 * SAMPLE_RATE), rng, start_hz, end_hz, 1.0), 0.045, spread=0.08)
    elif cue_id == "ambience-mountain":
        air = _periodic_texture(n, rng, harmonics=7) * 0.032
        stereo[:, 0] += air * 0.90
        stereo[:, 1] += air * 1.02
        for start in (7.4, 18.2):
            _stereo_add(stereo, start, _chirp(int(0.08 * SAMPLE_RATE), rng, 1200.0, 1420.0, 1.0), 0.030, spread=0.06)
    elif cue_id == "ambience-coast":
        ripple = _periodic_texture(n, rng, harmonics=30) * (0.030 + 0.010 * slow_breath)
        stereo[:, 0] += ripple * 0.90
        stereo[:, 1] += ripple * 1.08
        for start, width in ((2.4, 0.26), (6.9, 0.34), (11.8, 0.24), (16.7, 0.31), (21.1, 0.25)):
            local = _shaped_noise(int(0.85 * SAMPLE_RATE), rng, attack=0.015, release=0.20, level=1.0, control_step=96)
            lap_env = _gaussian_envelope(len(local), center=width, width=0.18)
            _stereo_add(stereo, start, local * lap_env, 0.050, spread=0.05)
    elif cue_id == "ambience-forest":
        leaves = _periodic_texture(n, rng, harmonics=55) * (0.020 + 0.014 * slow_breath)
        stereo[:, 0] += leaves * 0.92
        stereo[:, 1] += leaves * 1.03
        for start, start_hz, end_hz in ((5.8, 1100.0, 1350.0), (16.3, 980.0, 1260.0)):
            _stereo_add(stereo, start, _chirp(int(0.10 * SAMPLE_RATE), rng, start_hz, end_hz, 1.0), 0.034, spread=0.05)
    elif cue_id == "ambience-river":
        water = _periodic_texture(n, rng, harmonics=24) * (0.028 + 0.012 * slow_breath)
        reed = _periodic_texture(n, rng, harmonics=9) * 0.018
        stereo[:, 0] += water * 0.88 + reed * 0.94
        stereo[:, 1] += water * 1.06 + reed * 1.00
        for start in (3.4, 9.8, 15.5, 21.0):
            local = _shaped_noise(int(0.55 * SAMPLE_RATE), rng, attack=0.02, release=0.18, level=1.0, control_step=140)
            _stereo_add(stereo, start, local, 0.030, spread=0.035)
    elif cue_id == "ambience-evening":
        leaves = _periodic_texture(n, rng, harmonics=35) * (0.018 + 0.010 * slow_breath)
        warm = 0.018 * np.sin(TAU * 196.0 * t) + 0.009 * np.sin(TAU * 294.0 * t + 0.6)
        stereo[:, 0] += leaves * 0.94 + warm
        stereo[:, 1] += leaves * 1.04 + warm
        _stereo_add(stereo, 14.5, _chirp(int(0.10 * SAMPLE_RATE), rng, 980.0, 1040.0, 1.0), 0.012, spread=0.04)
    else:
        generic = _periodic_texture(n, rng, harmonics=20) * 0.020
        stereo[:, 0] += generic * 0.95
        stereo[:, 1] += generic * 1.05

    stereo[:, 0] = _circular_smooth(stereo[:, 0])
    stereo[:, 1] = _circular_smooth(stereo[:, 1])
    stereo -= np.mean(stereo, axis=0, keepdims=True) * 0.02
    return stereo


def synthesize(cue: dict[str, Any], rng: np.random.Generator) -> np.ndarray:
    cue_id = str(cue["id"])
    duration = float(cue["durationSeconds"])
    if bool(cue.get("loop")) and cue["bus"] in {"music", "ambience"}:
        return _synthesize_music(cue_id, duration, rng) if cue["bus"] == "music" else _synthesize_ambience(cue_id, duration, rng)
    return _synthesize_one_shot(cue_id, duration, rng)


def _apply_headroom(signal: np.ndarray, bus: str, cue_id: str) -> np.ndarray:
    target_db = TARGET_PEAK_DB[bus]
    if cue_id == "answer-retry":
        target_db -= 2.5
    if cue_id in {"message-send", "message-receive"}:
        target_db -= 1.0
    peak = float(np.max(np.abs(signal))) if signal.size else 0.0
    if peak <= 1e-12:
        return signal
    return signal * (db_to_linear(target_db) / peak)


def _write_wav_24(path: Path, signal: np.ndarray) -> float:
    """Write little-endian PCM24 WAV and return encoded sample peak in dBFS."""

    if signal.ndim == 1:
        channels = 1
        interleaved = signal[:, None]
    elif signal.ndim == 2 and signal.shape[1] in {1, 2}:
        channels = signal.shape[1]
        interleaved = signal
    else:
        raise ValueError(f"unexpected audio shape {signal.shape}")

    clipped = np.clip(np.asarray(interleaved, dtype=np.float64), -1.0, 1.0)
    quantized = np.rint(clipped * PCM24_MAX).astype("<i4")
    encoded_peak = int(np.max(np.abs(quantized))) if quantized.size else 0
    packed = np.ascontiguousarray(quantized).view(np.uint8).reshape(-1, 4)[:, :3].tobytes()

    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(channels)
        handle.setsampwidth(3)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(packed)
    peak_db = 20.0 * math.log10(max(encoded_peak, 1) / PCM24_MAX)
    return peak_db


def _tool_version(command: str) -> str | None:
    try:
        output = subprocess.check_output([command, "-version"], stderr=subprocess.STDOUT, text=True, timeout=10)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    return output.splitlines()[0].strip() if output.splitlines() else None


def _measure_audio(path: Path, ffprobe_path: str | None) -> dict[str, Any]:
    fallback: dict[str, Any]
    with wave.open(str(path), "rb") as handle:
        frames = handle.getnframes()
        channels = handle.getnchannels()
        sample_rate = handle.getframerate()
        sample_width = handle.getsampwidth()
    fallback = {
        "durationSeconds": frames / sample_rate,
        "sampleRate": sample_rate,
        "channels": channels,
        "bitsPerSample": sample_width * 8,
        "codec": "pcm_s24le" if sample_width == 3 else f"pcm_s{sample_width * 8}le",
        "measuredBy": "wave-header",
    }
    if not ffprobe_path:
        return fallback

    command = [
        ffprobe_path,
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_name,sample_rate,channels,bits_per_sample,duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, text=True, timeout=30)
        payload = json.loads(output)
        stream = (payload.get("streams") or [{}])[0]
        measured = dict(fallback)
        measured.update(
            {
                "durationSeconds": float(stream.get("duration") or fallback["durationSeconds"]),
                "sampleRate": int(stream.get("sample_rate") or fallback["sampleRate"]),
                "channels": int(stream.get("channels") or fallback["channels"]),
                "bitsPerSample": int(stream.get("bits_per_sample") or fallback["bitsPerSample"]),
                "codec": stream.get("codec_name") or fallback["codec"],
                "measuredBy": "ffprobe",
            }
        )
        return measured
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError, KeyError, IndexError):
        return fallback


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _loop_boundary(signal: np.ndarray) -> dict[str, Any] | None:
    if signal.ndim == 1:
        values = signal
    else:
        values = signal.mean(axis=1)
    if len(values) < 2:
        return None
    window = min(2048, len(values) // 4)
    seam_rms = float(np.sqrt(np.mean((values[:window] - values[-window:]) ** 2))) if window else 0.0
    return {
        "sampleWindow": window,
        "firstLastDelta": float(abs(values[0] - values[-1])),
        "seamWindowRms": seam_rms,
        "assessment": "sample-statistics-only; pending-human-listening",
    }


def _relative(path: Path, project_root: Path) -> str:
    return path.resolve().relative_to(project_root.resolve()).as_posix()


def _audio_relative(project_path: str) -> str:
    prefix = "design/audio/"
    return project_path[len(prefix) :] if project_path.startswith(prefix) else project_path


def _record(
    *,
    cue: dict[str, Any],
    variant: int,
    candidate_name: str,
    role: str,
    output_path: Path,
    master_path: Path,
    project_root: Path,
    seed: int,
    command: str,
    timestamp: str,
    tool_versions: dict[str, Any],
    ffprobe_path: str | None,
    encoded_peak_db: float,
    signal: np.ndarray,
    master_source: str | None,
    profile: str = "legacy",
    revision: str = "legacy",
    layers: Iterable[str] = (),
    prompt: str | None = None,
    prompt_source_path: str | None = None,
) -> dict[str, Any]:
    measured = _measure_audio(output_path, ffprobe_path)
    loop_boundary = _loop_boundary(signal) if bool(cue.get("loop")) else None
    deferred_reason = DEFERRED_IDS.get(cue["id"])
    return {
        "schemaVersion": 1,
        "assetRole": role,
        "catalogId": cue["id"],
        "variant": variant,
        "candidate": candidate_name,
        "candidatePath": _relative(output_path, project_root) if role == "candidate" else None,
        "masterPath": _relative(master_path, project_root),
        "masterSourceCandidate": master_source,
        "prompt": prompt or cue["prompt"],
        "promptSourcePath": prompt_source_path or "design/audio/audio-catalog.json",
        "provider": "local-procedural",
        "toolVersions": tool_versions,
        "generatorVersion": GENERATOR_VERSION,
        "profile": profile,
        "revision": revision,
        "layers": sorted(set(layers)),
        "seed": seed,
        "command": command,
        "timestamp": timestamp,
        "durationSecondsMeasured": measured["durationSeconds"],
        "durationMsMeasured": round(measured["durationSeconds"] * 1000.0),
        "targetDurationSeconds": float(cue["durationSeconds"]),
        "codec": measured["codec"],
        "sampleRate": measured["sampleRate"],
        "channels": measured["channels"],
        "bitsPerSample": measured["bitsPerSample"],
        "measurementSource": measured["measuredBy"],
        "bytes": output_path.stat().st_size,
        "sha256": _sha256(output_path),
        "encodedPeakDbFS": encoded_peak_db,
        "bus": cue["bus"],
        "loop": bool(cue.get("loop")),
        "loopBoundary": loop_boundary,
        "availability": cue.get("availability"),
        "deferred": deferred_reason is not None,
        "deferredReason": deferred_reason,
        "cost": 0,
        "license": "original procedural synthesis",
        "listeningStatus": "pending-human-listening",
    }


def candidate_names(cue_id: str, profile: str = "legacy", count: int | None = None) -> list[str]:
    """Return stable candidate labels without changing the legacy inventory."""

    if profile == ORGANIC_PROFILE:
        requested = 3 if count is None else max(1, int(count))
        return [f"candidate-{chr(ord('a') + index)}" for index in range(requested)]
    names = ["candidate-a"]
    if cue_id in PILOT_IDS:
        names.append("candidate-b")
    return names


def _candidate_names(cue_id: str, variant: int) -> list[str]:
    return candidate_names(cue_id, "legacy", None)


def _write_provenance(path: Path, records: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def _prompt_for(cue: dict[str, Any], profile: str) -> str:
    if profile != ORGANIC_PROFILE:
        return str(cue["prompt"])
    specific = ORGANIC_CUE_PROMPTS.get(str(cue["id"]), str(cue["prompt"]))
    return f"{ORGANIC_PROMPT_PREFIX}\nSpecific cue identity: {specific}"


def _write_pilot_manifest(
    *,
    path: Path,
    revision: str,
    profile: str,
    generated_at: str,
    catalog: dict[str, Any],
    selected_ids: set[str] | None,
    records: list[dict[str, Any]],
    project_root: Path,
) -> None:
    selected_cues = [
        cue for cue in catalog["cues"] if not selected_ids or str(cue["id"]) in selected_ids
    ]
    cue_records: list[dict[str, Any]] = []
    for cue in selected_cues:
        cue_id = str(cue["id"])
        candidates = [
            record
            for record in records
            if record["catalogId"] == cue_id and record["assetRole"] == "candidate"
        ]
        master = next(
            record
            for record in records
            if record["catalogId"] == cue_id and record["assetRole"] == "master"
        )
        cue_records.append(
            {
                "id": cue_id,
                "name": cue.get("name", cue_id),
                "bus": cue["bus"],
                "durationSeconds": float(cue["durationSeconds"]),
                "loop": bool(cue.get("loop")),
                "variants": 1,
                "catalogVariants": int(cue["variants"]),
                "trigger": cue.get("trigger", ""),
                "prompt": _prompt_for(cue, profile),
                "masterPath": master["masterPath"],
                "candidates": [
                    {
                        "name": record["candidate"],
                        "path": _audio_relative(record["candidatePath"]),
                        "masterPath": _audio_relative(record["masterPath"]),
                        "sha256": record["sha256"],
                        "bytes": record["bytes"],
                        "durationSecondsMeasured": record["durationSecondsMeasured"],
                        "sampleRate": record["sampleRate"],
                        "channels": record["channels"],
                        "bitsPerSample": record["bitsPerSample"],
                        "codec": record["codec"],
                        "encodedPeakDbFS": record["encodedPeakDbFS"],
                        "layers": record["layers"],
                        "listeningStatus": record["listeningStatus"],
                    }
                    for record in candidates
                ],
            }
        )
    payload = {
        "schemaVersion": 1,
        "revision": revision,
        "profile": profile,
        "status": "candidate-only",
        "acceptedEntries": 0,
        "generatedAt": generated_at,
        "provenancePath": _relative(
            project_root / "design" / "audio" / "provenance" / f"{revision}-asset-generation.jsonl",
            project_root,
        ),
        "cues": cue_records,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def generate(
    catalog: dict[str, Any],
    project_root: Path,
    catalog_path: Path,
    base_seed: int,
    only: set[str] | None,
    *,
    profile: str = "legacy",
    revision: str = "legacy",
    candidate_count: int | None = None,
) -> dict[str, Any]:
    if profile not in {"legacy", ORGANIC_PROFILE}:
        raise ValueError(f"unsupported synthesis profile: {profile}")
    if profile == ORGANIC_PROFILE and revision == "legacy":
        revision = ORGANIC_PROFILE

    audio_root = project_root / "design" / "audio"
    revision_root = revision if profile == ORGANIC_PROFILE else ""
    candidate_root = audio_root / "candidates" / revision_root if revision_root else audio_root / "candidates"
    master_root = audio_root / "masters" / revision_root if revision_root else audio_root / "masters"
    provenance_path = (
        audio_root / "provenance" / f"{revision}-asset-generation.jsonl"
        if revision_root
        else audio_root / "provenance" / "asset-generation.jsonl"
    )
    pilot_manifest_path = audio_root / "qa" / f"{revision}-pilot.json" if revision_root else None
    ffprobe_path = shutil.which("ffprobe")
    command = " ".join(shlex.quote(part) for part in [sys.executable, *sys.argv])
    timestamp = dt.datetime.now(dt.timezone.utc).isoformat()
    tool_versions = {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "ffmpeg": _tool_version(shutil.which("ffmpeg") or "ffmpeg"),
        "ffprobe": _tool_version(ffprobe_path or "ffprobe"),
    }

    records: list[dict[str, Any]] = []
    generated_candidates = 0
    generated_masters = 0
    selected_cues = 0
    target_variant_count = 0

    for cue in catalog["cues"]:
        cue_id = str(cue["id"])
        if only and cue_id not in only:
            continue
        selected_cues += 1
        variant_numbers = [1] if profile == ORGANIC_PROFILE else range(1, int(cue["variants"]) + 1)
        target_variant_count += len(variant_numbers)
        output_group = BUS_DIRECTORY[cue["bus"]]
        candidate_dir = candidate_root / output_group
        master_dir = master_root / output_group

        for variant in variant_numbers:
            master_name = f"{cue_id}__v{variant:02d}.wav"
            master_path = master_dir / master_name
            candidate_paths: list[tuple[str, Path, int, np.ndarray, float, list[str]]] = []
            labels = candidate_names(cue_id, profile, candidate_count if profile == ORGANIC_PROFILE else None)
            for candidate_name in labels:
                seed = stable_seed(base_seed, cue_id, variant, candidate_name)
                rng = np.random.default_rng(seed)
                if profile == ORGANIC_PROFILE:
                    raw_signal, layers = synthesize_organic(cue, rng)
                else:
                    raw_signal = synthesize(cue, rng)
                    layers = []
                signal = _apply_headroom(raw_signal, str(cue["bus"]), cue_id)
                candidate_path = candidate_dir / f"{cue_id}__v{variant:02d}__{candidate_name}.wav"
                encoded_peak_db = _write_wav_24(candidate_path, signal)
                candidate_paths.append((candidate_name, candidate_path, seed, signal, encoded_peak_db, layers))
                records.append(
                    _record(
                        cue=cue,
                        variant=variant,
                        candidate_name=candidate_name,
                        role="candidate",
                        output_path=candidate_path,
                        master_path=master_path,
                        project_root=project_root,
                        seed=seed,
                        command=command,
                        timestamp=timestamp,
                        tool_versions=tool_versions,
                        ffprobe_path=ffprobe_path,
                        encoded_peak_db=encoded_peak_db,
                        signal=signal,
                        master_source=None,
                        profile=profile,
                        revision=revision,
                        layers=layers,
                        prompt=_prompt_for(cue, profile),
                        prompt_source_path=(
                            "design/audio/tools/generate-procedural-assets.py#ORGANIC_PROMPT_PREFIX+ORGANIC_CUE_PROMPTS"
                            if profile == ORGANIC_PROFILE
                            else None
                        ),
                    )
                )
                generated_candidates += 1

            selected_name, selected_path, selected_seed, selected_signal, selected_peak_db, selected_layers = candidate_paths[0]
            master_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(selected_path, master_path)
            records.append(
                _record(
                    cue=cue,
                    variant=variant,
                    candidate_name=selected_name,
                    role="master",
                    output_path=master_path,
                    master_path=master_path,
                    project_root=project_root,
                    seed=selected_seed,
                    command=command,
                    timestamp=timestamp,
                    tool_versions=tool_versions,
                    ffprobe_path=ffprobe_path,
                    encoded_peak_db=selected_peak_db,
                    signal=selected_signal,
                    master_source=_relative(selected_path, project_root),
                    profile=profile,
                    revision=revision,
                    layers=selected_layers,
                    prompt=_prompt_for(cue, profile),
                    prompt_source_path=(
                        "design/audio/tools/generate-procedural-assets.py#ORGANIC_PROMPT_PREFIX+ORGANIC_CUE_PROMPTS"
                        if profile == ORGANIC_PROFILE
                        else None
                    ),
                )
            )
            generated_masters += 1

    _write_provenance(provenance_path, records)
    if pilot_manifest_path:
        _write_pilot_manifest(
            path=pilot_manifest_path,
            revision=revision,
            profile=profile,
            generated_at=timestamp,
            catalog=catalog,
            selected_ids=only,
            records=records,
            project_root=project_root,
        )

    return {
        "selectedCues": selected_cues,
        "targetVariants": target_variant_count,
        "candidates": generated_candidates,
        "masters": generated_masters,
        "provenance": _relative(provenance_path, project_root),
        "pilotManifest": _relative(pilot_manifest_path, project_root) if pilot_manifest_path else None,
        "profile": profile,
        "revision": revision,
        "ffprobe": ffprobe_path,
    }


def parse_args() -> argparse.Namespace:
    script_path = Path(__file__).resolve()
    audio_root = script_path.parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=audio_root / "audio-catalog.json")
    parser.add_argument("--seed", type=int, default=BASE_SEED)
    parser.add_argument("--only", nargs="*", help="generate only named catalog IDs")
    parser.add_argument("--profile", choices=["legacy", ORGANIC_PROFILE], default="legacy")
    parser.add_argument("--revision", default="legacy")
    parser.add_argument("--candidates", type=int, default=None, help="candidate count for a non-legacy profile")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[3]
    catalog_path = args.catalog.resolve()
    catalog = load_catalog(catalog_path)
    only = set(args.only or [])
    known_ids = {cue["id"] for cue in catalog["cues"]}
    unknown = only - known_ids
    if unknown:
        raise SystemExit(f"unknown catalog IDs: {', '.join(sorted(unknown))}")

    summary = generate(
        catalog,
        project_root,
        catalog_path,
        args.seed,
        only or None,
        profile=args.profile,
        revision=args.revision,
        candidate_count=args.candidates,
    )
    print("ARTIFACTS_READY_FOR_REVIEW")
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    print("listeningStatus=pending-human-listening")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
