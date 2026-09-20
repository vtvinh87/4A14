from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = PROJECT_ROOT / "design" / "audio" / "tools" / "generate-procedural-assets.py"
CATALOG_PATH = PROJECT_ROOT / "design" / "audio" / "audio-catalog.json"


def load_generator_module():
    spec = importlib.util.spec_from_file_location("generate_procedural_assets", MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import generator from {MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


module = load_generator_module()
with CATALOG_PATH.open("r", encoding="utf-8") as handle:
    CATALOG = json.load(handle)

PILOT_IDS = ["ui-tap", "answer-correct", "answer-retry", "stamp-press", "pet-fox", "music-home"]


def catalog_by_id(cue_id: str) -> dict:
    return next(cue for cue in CATALOG["cues"] if cue["id"] == cue_id)


class OrganicAudioGeneratorTests(unittest.TestCase):
    def test_organic_synthesis_reports_material_layers(self):
        cue = catalog_by_id("ui-tap")
        signal, layers = module.synthesize_organic(cue, np.random.default_rng(11))

        self.assertEqual(signal.ndim, 1)
        self.assertEqual(len(signal), round(cue["durationSeconds"] * module.SAMPLE_RATE))
        self.assertTrue({"contact", "resonance"}.issubset(layers))
        self.assertNotIn("pure-oscillator", layers)

    def test_organic_pilot_has_three_distinct_candidate_names(self):
        self.assertEqual(
            module.candidate_names("ui-tap", module.ORGANIC_PROFILE, 3),
            ["candidate-a", "candidate-b", "candidate-c"],
        )

    def test_legacy_candidate_contract_remains_two_for_pilot(self):
        self.assertEqual(
            module.candidate_names("ui-tap", "legacy", None),
            ["candidate-a", "candidate-b"],
        )

    def test_organic_profile_has_expected_shape_and_is_deterministic(self):
        for cue_id in PILOT_IDS:
            cue = catalog_by_id(cue_id)
            first, layers = module.synthesize_organic(cue, np.random.default_rng(101))
            repeat, _ = module.synthesize_organic(cue, np.random.default_rng(101))
            different, _ = module.synthesize_organic(cue, np.random.default_rng(102))

            expected_shape = round(cue["durationSeconds"] * module.SAMPLE_RATE)
            self.assertEqual(first.shape[0], expected_shape, cue_id)
            self.assertTrue(np.isfinite(first).all(), cue_id)
            self.assertGreater(float(np.max(np.abs(first))), 0.001, cue_id)
            self.assertTrue(set(layers).issubset(module.ORGANIC_LAYER_NAMES), cue_id)
            np.testing.assert_array_equal(first, repeat)
            self.assertFalse(np.array_equal(first, different), cue_id)

    def test_organic_pilot_generation_is_revision_safe(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            result = module.generate(
                CATALOG,
                Path(temp_dir),
                CATALOG_PATH,
                base_seed=20260919,
                only=set(PILOT_IDS),
                profile=module.ORGANIC_PROFILE,
                revision="organic-v2",
                candidate_count=3,
            )

            self.assertEqual(result["candidates"], 18)
            self.assertEqual(result["masters"], 6)
            self.assertEqual(result["revision"], "organic-v2")
            manifest_path = Path(temp_dir) / result["pilotManifest"]
            with manifest_path.open("r", encoding="utf-8") as handle:
                manifest = json.load(handle)
            self.assertEqual(manifest["status"], "candidate-only")
            self.assertEqual(manifest["acceptedEntries"], 0)
            self.assertEqual(len(manifest["cues"]), 6)
            self.assertTrue(all(len(cue["candidates"]) == 3 for cue in manifest["cues"]))

    def test_audition_page_declares_revision_mode(self):
        audition = (PROJECT_ROOT / "design" / "audio" / "audition.html").read_text(encoding="utf-8")
        self.assertIn("revision=organic-v2", audition)
        self.assertIn("candidate-a", audition)
        self.assertIn("candidate-b", audition)
        self.assertIn("candidate-c", audition)


if __name__ == "__main__":
    unittest.main()
