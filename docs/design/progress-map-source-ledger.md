# Bản đồ tiến bộ — source ledger

## Current asset

- Runtime asset: public/art/progress/vietnam-progress-map.svg
- Asset SHA-256: c441ae8fa800ed569a3654942e111f4c4ccc2c857acb384190d99d382f3eb534
- Asset size: 66,821 bytes
- Output format: SVG, viewBox 0 0 920 970
- Features: mainland, Hoàng Sa, Trường Sa as separate data-geo-feature groups
- Runtime policy: local-only; no remote href, script, map tile, or external image

## Source record

- Primary technical source used for the current local prototype: Nguyen Duy Liem, Vietnam GIS Data, repository commit ccb9f4ae992418bfeefd06da1eb42d0249632176.
- Source URL: https://github.com/nguyenduy1133/Free-GIS-Data
- Source file: Vietnam Administrative Divisions (Pre-2025) - Đơn vị hành chính Việt Nam (Trước 2025)/Provinces_included_Paracel_SpratlyIslands_combine.geojson
- Source file SHA-256: 5756c34a6388b9b7add9b06da0ecf3f3c67f053fb533342cf55ca04ae8a4f19c
- Accessed: 2026-09-17
- Attribution: Nguyễn Duy Liêm, Vietnam GIS Data, 2025, https://github.com/nguyenduy1133/Free-GIS-Data
- License note: the repository README describes the data as free for public use and requests citation, but does not publish an SPDX license identifier. Keep this attribution and perform a release/legal review before external distribution.
- Official visual reference for cross-check: Bản đồ hành chính Việt Nam, Cục Đo đạc, Bản đồ và Thông tin địa lý, https://vnsdi.mae.gov.vn/bandohanhchinh/

## Transform record

- Source geometry is GeoJSON in longitude/latitude degrees.
- The prototype uses an equirectangular presentation transform into a 920 by 970 SVG viewBox.
- Simplification tolerance: 0.02 degrees in source coordinate space; coordinates rounded to one decimal SVG unit after projection.
- Province boundaries are rendered with a low-opacity common stroke and fill for recognizability; no province name or political boundary claim is exposed in the child UI.
- Hoàng Sa and Trường Sa are identified from the source feature notes and remain separate geometry groups.
- The map viewport is minLatitude 6.7, maxLatitude 23.5, minLongitude 102.1, maxLongitude 118.0. The initial 8.2/115 limits were rejected because the source geometry reaches approximately 6.95°B and 116.95°Đ in Trường Sa; keeping the narrower viewport would clip part of the archipelago.
- Topic anchors are interface storytelling points, not administrative regions, maritime boundaries, travel routes or new geographic claims.

## Review record

- [x] Technical visual QA completed at desktop, tablet/mobile and low-height landscape sizes; the local SVG remains the geography layer and the UI overlays remain separate.
- [x] Confirmed Hoàng Sa and Trường Sa are both visible, separately labelled in the DOM layer, and not covered by route/node/decorative layers at the checked viewports.
- [x] Permission basis recorded: the pinned source README explicitly says the dataset is free for public use and requests citation; attribution, source commit and checksums are preserved here and beside the runtime asset. This is a documented permission basis, not a formal legal opinion.
- Reviewer: Codex implementation audit, 2026-09-17.
