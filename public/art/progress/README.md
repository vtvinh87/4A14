# Progress map assets

`vietnam-progress-map.svg` is the locked geography layer for the child-facing progress map.

`adventure-paper-texture.png` is a lightweight, AI-generated decorative skin only. It contains no map, text, coastline or geographic claim; geographic truth remains exclusively in the local SVG above.

- It is a locally bundled SVG; the runtime does not fetch map data or images.
- `data-geo-feature="mainland"`, `data-geo-feature="hoang-sa"` and `data-geo-feature="truong-sa"` are kept as separate groups for validation and review.
- Game route lines, topic anchors, labels, compass art and paper texture belong to the UI layer and must not be baked into this SVG.
- Do not redraw or regenerate the coastline with an image model. Rebuild only from the source and process recorded in the source ledger.
- Attribution and the current source checksum are recorded in docs/design/progress-map-source-ledger.md. The source README at the pinned commit states that the dataset is free for public use and requests citation; this project preserves that attribution and keeps the exact source commit/checksum for auditability.
