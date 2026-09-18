# Progress map assets

`vietnam-progress-map-illustrated.png` is the single flattened artwork loaded
by the child-facing progress-map runtime. It keeps the complete AI source
canvas, including the illustrated sea, sky, mainland, coastal islands, Hoàng
Sa, Trường Sa and the eight regional landmark scenes. Its labels are composed
in the local build pipeline, not generated as AI text. The runtime artwork is
not clipped to the reference land silhouette.

`vietnam-progress-map.svg` is retained as a local reference/QA geometry asset.
It is not rendered as a second runtime map layer and is not included in the
active offline art allowlist. The reference keeps
`data-geo-feature="mainland"`, `data-geo-feature="hoang-sa"` and
`data-geo-feature="truong-sa"` as separate groups for geometry checks.

The runtime contains no map tile, remote image, embedded script, province
label, maritime claim line or yellow route connecting learning stages. The
landmark hit areas are semantic React controls placed over the flattened
artwork; they do not paint a second visible image layer.

The AI source and generation brief are kept under
`design/progress-map/ai/`. The deterministic build details, attribution,
source checksum and runtime checksum are recorded in
`docs/design/progress-map-source-ledger.md`. The source README at the pinned
commit states that the dataset is free for public use and requests citation;
this project preserves that attribution and keeps the exact source
commit/checksum for auditability. This is not a formal legal opinion.
