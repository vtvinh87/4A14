#!/usr/bin/env python3
"""Record the user's sourced-v1 pilot selections without runtime promotion."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
REVISION = "sourced-v1"
PILOT_PATH = ROOT / "design/audio/qa/sourced-v1-pilot.json"
SELECTION_PATH = ROOT / "design/audio/qa/sourced-v1-selection.json"
PROVENANCE_PATH = ROOT / "design/audio/provenance/sourced-v1-selection.jsonl"

SELECTIONS = {
    "ui-tap": "candidate-b",
    "answer-correct": "candidate-a",
    "answer-retry": "candidate-b",
    "stamp-press": "candidate-c",
    "pet-fox": "candidate-b",
    "music-home": "candidate-b",
}


def url_for(path: str) -> str:
    return "./" + path.removeprefix("design/audio/")


def master_path(cue: dict) -> str:
    bus_dir = "beds" if cue["bus"] == "music" else "sfx"
    return f"design/audio/masters/{REVISION}/{bus_dir}/{cue['id']}__v01.wav"


def main() -> None:
    reviewed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    pilot = json.loads(PILOT_PATH.read_text(encoding="utf-8"))
    cues_by_id = {cue["id"]: cue for cue in pilot.get("cues", [])}
    if set(cues_by_id) != set(SELECTIONS):
        raise ValueError(f"Selection cue set mismatch: {sorted(cues_by_id)}")

    masters = []
    provenance = []
    for cue_id, selected_name in SELECTIONS.items():
        cue = cues_by_id[cue_id]
        candidates = {candidate["name"]: candidate for candidate in cue["candidates"]}
        if selected_name not in candidates:
            raise ValueError(f"Missing {cue_id}/{selected_name}")
        selected = candidates[selected_name]
        selected["selectionStatus"] = "selected-by-user"
        selected["listeningStatus"] = "accepted"
        selected["accepted"] = True
        selected["selectedBy"] = "user"
        selected["reviewedAt"] = reviewed_at
        selected["reviewEvidence"] = "User selected this candidate after listening in the sourced-v1 audition page; device/mix regression remains open."

        destination = master_path(cue)
        source = ROOT / selected["path"]
        target = ROOT / destination
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        selected["masterPath"] = destination
        selected["masterRelativeUrl"] = url_for(destination)
        masters.append(
            {
                "cueId": cue_id,
                "candidate": selected_name,
                "sourcePath": selected["path"],
                "masterPath": destination,
                "sha256": selected["sha256"],
                "bytes": target.stat().st_size,
                "status": "pilot-selected",
            }
        )

        for candidate in cue["candidates"]:
            if candidate["name"] == selected_name:
                continue
            candidate["selectionStatus"] = "not-selected"
            candidate["listeningStatus"] = "not-selected"
            candidate["accepted"] = False
            candidate["selectedBy"] = "user"
            candidate["reviewedAt"] = reviewed_at
            candidate["reviewEvidence"] = "User selected another candidate for this pilot cue; keep this file as comparison evidence."
            candidate["masterPath"] = None
            candidate["masterRelativeUrl"] = None

        provenance.append(
            {
                "schemaVersion": 1,
                "recordType": "user-selection",
                "revision": REVISION,
                "reviewedAt": reviewed_at,
                "reviewer": "user",
                "cueId": cue_id,
                "selectedCandidate": selected_name,
                "sourcePath": selected["path"],
                "masterPath": destination,
                "sourceProvider": selected["sourceProvider"],
                "license": selected["license"],
                "costUsd": 0,
                "status": "pilot-selected",
                "runtimePromotion": False,
                "remainingGates": [
                    "mix and loudness review",
                    "laptop/phone/headphones listening",
                    "mute/background/offline regression",
                    "full catalog coverage beyond the six-cue pilot",
                ],
            }
        )

    pilot["status"] = "pilot-selected"
    pilot["acceptedEntries"] = len(SELECTIONS)
    pilot["selectedEntries"] = len(SELECTIONS)
    pilot["runtimePromotion"] = False
    pilot["reviewedAt"] = reviewed_at
    pilot["reviewer"] = "user"
    pilot["reviewSurface"] = "design/audio/audition.html?revision=sourced-v1"
    pilot["selectionNote"] = "Six representative candidates selected by the user; this is not production/runtime acceptance."
    PILOT_PATH.write_text(json.dumps(pilot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    selection = {
        "schemaVersion": 1,
        "revision": REVISION,
        "status": "pilot-selected",
        "reviewer": "user",
        "reviewedAt": reviewed_at,
        "reviewSurface": "design/audio/audition.html?revision=sourced-v1",
        "decisions": SELECTIONS,
        "selectedEntries": len(SELECTIONS),
        "runtimePromotion": False,
        "runtimeAcceptedEntries": 0,
        "masters": masters,
        "remainingGates": [
            "mix/loudness pass",
            "full device listening evidence",
            "mute/background/offline regression",
            "selection of remaining catalog variants",
            "license/attribution sign-off before delivery",
        ],
    }
    SELECTION_PATH.write_text(json.dumps(selection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with PROVENANCE_PATH.open("w", encoding="utf-8") as handle:
        for record in provenance:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(
        "SELECTION_RECORDED"
        f" revision={REVISION} selected={len(SELECTIONS)}"
        " runtimePromotion=false runtimeAcceptedEntries=0"
    )


if __name__ == "__main__":
    main()
