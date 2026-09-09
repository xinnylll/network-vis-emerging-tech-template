# Source-to-view provenance

1. Use the public `airports` subset from `anomalypoint/NEExT` at revision `36114f8da77d4fe5b4700a7ff2673b15901a6caf`.
2. Retain the three independent graph folders: `brazil`, `europe`, and `usa`.
3. Copy `nodes.csv` and `edges.csv` without changing their published fields or values.
4. Parse node IDs as strings for lossless browser lookup and parse `activity_quartile` as integer labels 0–3.
5. Treat edges as undirected, remove self-loops if present, and deduplicate endpoint pairs. The resulting counts match the published NEExT data card.
6. Compute node degree from the retained edge list.
7. Compute a deterministic two-dimensional NetworkX spring layout with the energy optimizer and scale each axis to [0, 1] using robust 1st/99th-percentile bounds.
8. Save browser-ready JSON and a manifest containing source URLs, revision, graph counts, and SHA-256 checksums for the copied CSVs.
9. Render routes and airports in Canvas. Map raw labels 0–3 to display labels Q1–Q4 and four colors; map degree to node radius.

The script [`scripts/prepare_airport_data.py`](../scripts/prepare_airport_data.py) reproduces steps 4–8. The layout is a display algorithm, not source evidence. It adds no airport name, location, route direction, route frequency, or traffic-volume claim.
