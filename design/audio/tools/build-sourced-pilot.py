#!/usr/bin/env python3
"""Build the auditable, candidate-only sourced-v1 audio pilot.

The downloaded source packs are kept intact. This script only inventories
normalized review derivatives and writes manifests/provenance; it never marks
an asset accepted or copies anything to public/audio.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REVISION = "sourced-v1"
PILOT_PATH = ROOT / "design/audio/qa/sourced-v1-pilot.json"
PROVENANCE_PATH = ROOT / "design/audio/provenance/sourced-v1-asset-provenance.jsonl"
SOURCE_MANIFEST_PATH = ROOT / "design/audio/qa/sourced-v1-source-manifest.json"

SOURCE_PACKS = [
    {
        "id": "dustyroom-free-casual-game-sounds",
        "provider": "Dustyroom",
        "pack": "Free Casual Game Sounds",
        "archivePath": "design/audio/sourced-v1/source-packs/dustyroom/DM-CGS.zip",
        "downloadUrl": "https://dustyroom.com/casualgamesounds/DM-CGS.zip",
        "sourcePage": "https://dustyroom.com/free-casual-game-sounds/",
        "license": "CC0",
        "licenseEvidenceUrl": "https://dustyroom.com/free-casual-game-sounds/",
        "licenseEvidenceLocal": "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/license.pdf",
        "costUsd": 0,
        "credit": "Dustyroom (credit appreciated, not mandatory)",
    },
    {
        "id": "kenney-interface-sounds",
        "provider": "Kenney",
        "pack": "Interface Sounds",
        "archivePath": "design/audio/sourced-v1/source-packs/kenney/kenney_interface-sounds.zip",
        "downloadUrl": "https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip",
        "sourcePage": "https://kenney.nl/assets/interface-sounds",
        "license": "CC0",
        "licenseEvidenceUrl": "https://kenney.nl/assets/interface-sounds",
        "licenseEvidenceLocal": "design/audio/sourced-v1/source-packs/kenney/unpacked/License.txt",
        "costUsd": 0,
        "credit": "Kenney (credit optional)",
    },
    {
        "id": "opengameart-robin-lamb-ui",
        "provider": "OpenGameArt",
        "pack": "UI Sound Effects (Button Clicks, User Feedback, Notifications)",
        "archivePath": "design/audio/sourced-v1/source-packs/opengameart/ui_wav.zip",
        "downloadUrl": "https://opengameart.org/sites/default/files/ui_wav.zip",
        "sourcePage": "https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications",
        "license": "CC0",
        "licenseEvidenceUrl": "https://opengameart.org/content/ui-sound-effects-button-clicks-user-feedback-notifications",
        "licenseEvidenceLocal": None,
        "costUsd": 0,
        "credit": "Robin Lamb / OpenGameArt.org; source libraries credited on source page",
    },
    {
        "id": "opengameart-calm-theme",
        "provider": "OpenGameArt",
        "pack": "calm theme",
        "archivePath": "design/audio/sourced-v1/source-packs/opengameart/calm_theme.ogg",
        "downloadUrl": "https://opengameart.org/sites/default/files/calm_theme.ogg",
        "sourcePage": "https://opengameart.org/content/calm-theme",
        "license": "CC0",
        "licenseEvidenceUrl": "https://opengameart.org/content/calm-theme",
        "licenseEvidenceLocal": None,
        "costUsd": 0,
        "credit": "pebonius / OpenGameArt.org; credit link recommended on source page",
    },
    {
        "id": "opengameart-simple-loop",
        "provider": "OpenGameArt",
        "pack": "Simple menu/background music loop",
        "archivePath": "design/audio/sourced-v1/source-packs/opengameart/simple_loop.ogg",
        "downloadUrl": "https://opengameart.org/sites/default/files/simple_loop.ogg",
        "sourcePage": "https://opengameart.org/content/simple-menubackground-music-loop",
        "license": "CC0",
        "licenseEvidenceUrl": "https://opengameart.org/content/simple-menubackground-music-loop",
        "licenseEvidenceLocal": None,
        "costUsd": 0,
        "credit": "polosik / OpenGameArt.org",
    },
    {
        "id": "opengameart-calm-track",
        "provider": "OpenGameArt",
        "pack": "Calm track",
        "archivePath": "design/audio/sourced-v1/source-packs/opengameart/calm_track-loop.ogg",
        "downloadUrl": "https://opengameart.org/sites/default/files/calm_track-loop.ogg",
        "sourcePage": "https://opengameart.org/content/calm-track",
        "license": "CC0",
        "licenseEvidenceUrl": "https://opengameart.org/content/calm-track",
        "licenseEvidenceLocal": None,
        "costUsd": 0,
        "credit": "pmiller / OpenGameArt.org",
    },
]


PILOT = [
    {
        "id": "ui-tap",
        "bus": "sfx",
        "targetDurationSeconds": 0.10,
        "loop": False,
        "intent": "neutral tactile UI contact; no computer-beep or punitive edge",
        "candidates": [
            ("candidate-a", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/click_001.ogg", "design/audio/candidates/sourced-v1/sfx/ui-tap__candidate-a.wav", "CC0", "named click candidate from a modern interface pack"),
            ("candidate-b", "OpenGameArt", "design/audio/sourced-v1/source-packs/opengameart/unpacked/ui_wav/click_2.wav", "design/audio/candidates/sourced-v1/sfx/ui-tap__candidate-b.wav", "CC0", "public-domain UI click comparison"),
            ("candidate-c", "Dustyroom", "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/WAV/DM-CGS-03.wav", "design/audio/candidates/sourced-v1/sfx/ui-tap__candidate-c.wav", "CC0", "short casual-game UI source; file identity remains to be judged by listening"),
        ],
    },
    {
        "id": "answer-correct",
        "bus": "sfx",
        "targetDurationSeconds": 0.72,
        "loop": False,
        "intent": "warm affirmative feedback without a jackpot, coin cascade, or loud bell",
        "candidates": [
            ("candidate-a", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/confirmation_001.ogg", "design/audio/candidates/sourced-v1/sfx/answer-correct__candidate-a.wav", "CC0", "named confirmation candidate"),
            ("candidate-b", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/confirmation_003.ogg", "design/audio/candidates/sourced-v1/sfx/answer-correct__candidate-b.wav", "CC0", "alternate named confirmation candidate"),
            ("candidate-c", "Dustyroom", "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/WAV/DM-CGS-04.wav", "design/audio/candidates/sourced-v1/sfx/answer-correct__candidate-c.wav", "CC0", "longer casual-game feedback candidate"),
        ],
    },
    {
        "id": "answer-retry",
        "bus": "sfx",
        "targetDurationSeconds": 0.38,
        "loop": False,
        "intent": "patient invitation to look again; reject buzzers, falling tones, and shame cues",
        "candidates": [
            ("candidate-a", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/question_001.ogg", "design/audio/candidates/sourced-v1/sfx/answer-retry__candidate-a.wav", "CC0", "named question/neutral-feedback candidate"),
            ("candidate-b", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/question_003.ogg", "design/audio/candidates/sourced-v1/sfx/answer-retry__candidate-b.wav", "CC0", "alternate named question candidate"),
            ("candidate-c", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/question_004.ogg", "design/audio/candidates/sourced-v1/sfx/answer-retry__candidate-c.wav", "CC0", "alternate named question candidate; must be checked for punitive character"),
        ],
    },
    {
        "id": "stamp-press",
        "bus": "sfx",
        "targetDurationSeconds": 0.70,
        "loop": False,
        "intent": "soft satisfying paper/pressure gesture; no gunshot-like transient or metal slam",
        "candidates": [
            ("candidate-a", "Dustyroom", "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/WAV/DM-CGS-05.wav", "design/audio/candidates/sourced-v1/sfx/stamp-press__candidate-a.wav", "CC0", "longer casual-game tactile candidate"),
            ("candidate-b", "Dustyroom", "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/WAV/DM-CGS-06.wav", "design/audio/candidates/sourced-v1/sfx/stamp-press__candidate-b.wav", "CC0", "alternate tactile candidate"),
            ("candidate-c", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/drop_004.ogg", "design/audio/candidates/sourced-v1/sfx/stamp-press__candidate-c.wav", "CC0", "named drop/contact comparison; must be checked for excessive impact"),
        ],
    },
    {
        "id": "pet-fox",
        "bus": "sfx",
        "targetDurationSeconds": 0.65,
        "loop": False,
        "intent": "quick friendly nonverbal personality; no animal scream, voice, or cartoon squeal",
        "candidates": [
            ("candidate-a", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/pluck_001.ogg", "design/audio/candidates/sourced-v1/sfx/pet-fox__candidate-a.wav", "CC0", "short named pluck candidate"),
            ("candidate-b", "Kenney", "design/audio/sourced-v1/source-packs/kenney/unpacked/Audio/pluck_002.ogg", "design/audio/candidates/sourced-v1/sfx/pet-fox__candidate-b.wav", "CC0", "alternate named pluck candidate"),
            ("candidate-c", "Dustyroom", "design/audio/sourced-v1/source-packs/dustyroom/unpacked/DM-CGS/WAV/DM-CGS-03.wav", "design/audio/candidates/sourced-v1/sfx/pet-fox__candidate-c.wav", "CC0", "short casual-game personality comparison"),
        ],
    },
    {
        "id": "music-home",
        "bus": "music",
        "targetDurationSeconds": 48.0,
        "loop": True,
        "intent": "calm, welcoming game bed; 48-second excerpt only, loop seam remains unverified",
        "candidates": [
            ("candidate-a", "OpenGameArt", "design/audio/sourced-v1/source-packs/opengameart/calm_theme.ogg", "design/audio/candidates/sourced-v1/beds/music-home__candidate-a.wav", "CC0", "calm exploration source, excerpted from 0s to 48s"),
            ("candidate-b", "OpenGameArt", "design/audio/sourced-v1/source-packs/opengameart/simple_loop.ogg", "design/audio/candidates/sourced-v1/beds/music-home__candidate-b.wav", "CC0", "menu/background loop source, excerpted from 0s to 48s"),
            ("candidate-c", "OpenGameArt", "design/audio/sourced-v1/source-packs/opengameart/calm_track-loop.ogg", "design/audio/candidates/sourced-v1/beds/music-home__candidate-c.wav", "CC0", "calm-track source, excerpted from 0s to 48s"),
        ],
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def probe(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=codec_name,sample_rate,channels,bits_per_sample",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    stream = (payload.get("streams") or [{}])[0]
    duration = float((payload.get("format") or {}).get("duration", 0))
    return {
        "codec": stream.get("codec_name"),
        "sampleRate": int(stream["sample_rate"]) if stream.get("sample_rate") else None,
        "channels": int(stream["channels"]) if stream.get("channels") else None,
        "bitsPerSample": int(stream["bits_per_sample"]) if stream.get("bits_per_sample") else None,
        "durationSeconds": round(duration, 6),
    }


def source_pack_for_file(source_path: str) -> dict:
    if "/dustyroom/" in source_path:
        pack_id = "dustyroom-free-casual-game-sounds"
    elif "/kenney/" in source_path:
        pack_id = "kenney-interface-sounds"
    elif source_path.endswith("unpacked/ui_wav/click_2.wav"):
        pack_id = "opengameart-robin-lamb-ui"
    elif source_path.endswith("calm_theme.ogg"):
        pack_id = "opengameart-calm-theme"
    elif source_path.endswith("simple_loop.ogg"):
        pack_id = "opengameart-simple-loop"
    elif source_path.endswith("calm_track-loop.ogg"):
        pack_id = "opengameart-calm-track"
    else:
        raise KeyError(f"No source pack registered for {source_path}")
    return next(pack for pack in SOURCE_PACKS if pack["id"] == pack_id)


def relative_url(path: str) -> str:
    return "./" + path.removeprefix("design/audio/")


def main() -> None:
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    source_records = []
    for pack in SOURCE_PACKS:
        archive = ROOT / pack["archivePath"]
        if not archive.is_file():
            raise FileNotFoundError(archive)
        record = dict(pack)
        record["sha256"] = sha256(archive)
        record["bytes"] = archive.stat().st_size
        record["downloaded"] = True
        source_records.append(record)

    cues = []
    provenance = []
    for cue in PILOT:
        candidate_records = []
        for name, provider, source_path, output_path, license_name, rationale in cue["candidates"]:
            source = ROOT / source_path
            output = ROOT / output_path
            if not source.is_file():
                raise FileNotFoundError(source)
            if not output.is_file():
                raise FileNotFoundError(output)
            source_meta = probe(source)
            output_meta = probe(output)
            source_pack = source_pack_for_file(source_path)
            candidate = {
                "name": name,
                "path": output_path,
                "relativeUrl": relative_url(output_path),
                "bytes": output.stat().st_size,
                "sha256": sha256(output),
                "codec": output_meta["codec"],
                "sampleRate": output_meta["sampleRate"],
                "channels": output_meta["channels"],
                "bitsPerSample": output_meta["bitsPerSample"],
                "durationSeconds": output_meta["durationSeconds"],
                "sourceProvider": provider,
                "sourceFile": source_path,
                "sourcePage": source_pack["sourcePage"],
                "downloadUrl": source_pack["downloadUrl"],
                "licenseEvidenceUrl": source_pack["licenseEvidenceUrl"],
                "licenseEvidenceLocal": source_pack["licenseEvidenceLocal"],
                "credit": source_pack["credit"],
                "sourceSha256": sha256(source),
                "sourceBytes": source.stat().st_size,
                "sourceMetadata": source_meta,
                "license": license_name,
                "costUsd": 0,
                "selectionRationale": rationale,
                "transform": (
                    "ffmpeg resample to 48 kHz, downmix mono, PCM s24le"
                    if cue["bus"] == "sfx"
                    else "ffmpeg excerpt from 0s to 48s, resample to 48 kHz, preserve stereo, PCM s24le"
                ),
                "loopSeamStatus": "unverified" if cue["loop"] else None,
                "listeningStatus": "pending-human-listening",
                "accepted": False,
                "peakDbTP": None,
                "measuredLufs": None,
            }
            candidate_records.append(candidate)
            provenance.append(
                {
                    "schemaVersion": 1,
                    "recordType": "candidate",
                    "revision": REVISION,
                    "generatedAt": now,
                    "cueId": cue["id"],
                    "candidate": name,
                    "outputPath": output_path,
                    "sourceProvider": provider,
                    "sourceFile": source_path,
                    "sourcePage": source_pack["sourcePage"],
                    "licenseEvidenceUrl": source_pack["licenseEvidenceUrl"],
                    "licenseEvidenceLocal": source_pack["licenseEvidenceLocal"],
                    "sourceSha256": candidate["sourceSha256"],
                    "outputSha256": candidate["sha256"],
                    "license": license_name,
                    "costUsd": 0,
                    "selectionBrief": cue["intent"],
                    "transform": candidate["transform"],
                    "status": "candidate-only",
                    "listeningStatus": "pending-human-listening",
                }
            )
        cues.append(
            {
                "id": cue["id"],
                "bus": cue["bus"],
                "targetDurationSeconds": cue["targetDurationSeconds"],
                "loop": cue["loop"],
                "intent": cue["intent"],
                "candidates": candidate_records,
            }
        )

    manifest = {
        "schemaVersion": 1,
        "revision": REVISION,
        "status": "candidate-only",
        "acceptedEntries": 0,
        "costUsd": 0,
        "generatedAt": now,
        "sourcePolicy": "free CC0/public-domain sources only; no account, payment, donation, API, or new credential",
        "cues": cues,
    }
    source_manifest = {
        "schemaVersion": 1,
        "revision": REVISION,
        "generatedAt": now,
        "status": "downloaded-and-license-audited",
        "costUsd": 0,
        "packs": source_records,
        "notUsed": [
            {
                "provider": "Sonniss",
                "reason": "researched as a high-quality lead, but the archive is too large for this focused pilot and no files were downloaded",
                "licensePage": "https://sonniss.com/gdc-bundle-license/",
            },
            {
                "provider": "Freesound",
                "reason": "not selected because license/attribution is per sound and the first pilot can be audited with CC0 packs",
                "licensePage": "https://freesound.org/help/faq/",
            },
        ],
    }

    PILOT_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    SOURCE_MANIFEST_PATH.write_text(json.dumps(source_manifest, ensure_ascii=False, indent=2) + "\n")
    with PROVENANCE_PATH.open("w", encoding="utf-8") as handle:
        for record in source_records:
            handle.write(json.dumps({"schemaVersion": 1, "recordType": "source-pack", "revision": REVISION, "generatedAt": now, **record}, ensure_ascii=False) + "\n")
        for record in provenance:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(
        "ARTIFACTS_READY_FOR_REVIEW"
        f" revision={REVISION} cues={len(cues)} candidates={sum(len(cue['candidates']) for cue in cues)}"
        " acceptedEntries=0 listeningStatus=pending-human-listening"
    )


if __name__ == "__main__":
    main()
