# NEExT Airport Network Explorer — INFOSCI 301

An interactive node-link visualization of the `airports` subset in [`anomalypoint/NEExT`](https://huggingface.co/datasets/anomalypoint/NEExT). Nodes represent airports, edges represent commercial flight routes, and node color represents the supplied `activity_quartile` label. The browser can switch among the independent Brazil, Europe, and USA graphs.

## Run

From this repository folder:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Alternatively, with Node.js 20 or later, run `npm run dev`. Use an HTTP server; opening `index.html` directly with `file://` will not load JSON.

## What is implemented

- Canvas node-link diagrams for Brazil (131 nodes / 1,003 edges), Europe (399 / 5,993), and USA (1,190 / 13,599).
- Color encoding and interactive filtering for four activity-quartile classes.
- Degree-scaled nodes, topology-derived force-directed positions, node search, pan/zoom, hub labels, and click-to-inspect route highlighting.
- Selected-node details, neighbor-class composition, graph-level metrics, quartile degree profiles, an accessible hub table, and CSV/JSON downloads.
- Explicit caveats: dataset IDs are not airport codes, and the dataset includes no airport names, geographic coordinates, route direction, frequency, or distance.

## Data semantics

The three graphs are separate and undirected. The NEExT table contract is:

- `nodes.csv`: `node_id`, `activity_quartile`
- `edges.csv`: `src_node_id`, `dest_node_id`

The interface displays raw labels 0–3 as Q1–Q4 while preserving the original values in labels and downloads. Node position is computed from adjacency and does **not** encode geography. Node size is a derived degree count.

See [DATA_CARD.md](DATA_CARD.md), [docs/PROVENANCE.md](docs/PROVENANCE.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for source, transformation, license, and limitation details.

## Reproduce and check

The checked-in JSON includes deterministic force-directed layout coordinates. To rebuild it from downloaded NEExT CSV folders:

```sh
python3 scripts/prepare_airport_data.py --source /path/to/airports/neext
npm run check
```

The preparation script requires NetworkX, NumPy, and SciPy. `npm run check` verifies expected graph counts, endpoint integrity, unique undirected edges, quartile labels, recomputed degrees, layout coordinates, source CSV hashes, and local links.

## Structure

| Path | Purpose |
|---|---|
| `dist/` | Complete static visualization |
| `dist/data/airports/` | Source CSV copies, visualization JSON, and manifest |
| `scripts/prepare_airport_data.py` | Reproducible topology layout and JSON build |
| `scripts/validate.mjs` | Dataset and site validation |
| `docs/` | Provenance and AI-assistance documentation |

## Citation

Dataset mirror: [`anomalypoint/NEExT`](https://huggingface.co/datasets/anomalypoint/NEExT), airports subset, pinned revision `36114f8da77d4fe5b4700a7ff2673b15901a6caf`.

Upstream benchmark: Ribeiro, L. F. R., Savarese, P. H. P., & Figueiredo, D. R. (2017). *struc2vec: Learning Node Representations from Structural Identity*. KDD 2017.
