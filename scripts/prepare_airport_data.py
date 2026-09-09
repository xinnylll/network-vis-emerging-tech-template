"""Build browser-ready NEExT airport network files from the published CSV tables.

Usage:
    python3 scripts/prepare_airport_data.py --source /path/to/downloaded/airports/neext

The source directory must contain brazil/, europe/, and usa/ folders, each with
nodes.csv and edges.csv. Layout coordinates use a deterministic force-directed layout;
they describe topology, not airport geography.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import statistics
from pathlib import Path

import networkx as nx
import numpy as np


REGIONS = {
    "brazil": "Brazil",
    "europe": "Europe",
    "usa": "United States",
}
REVISION = "36114f8da77d4fe5b4700a7ff2673b15901a6caf"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_graph(nodes_path: Path, edges_path: Path):
    with nodes_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    nodes = [{"id": row["node_id"], "quartile": int(row["activity_quartile"])} for row in rows]
    index = {node["id"]: i for i, node in enumerate(nodes)}

    edges = []
    seen = set()
    with edges_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            source, target = row["src_node_id"], row["dest_node_id"]
            if source == target:
                continue
            a, b = index[source], index[target]
            key = (min(a, b), max(a, b))
            if key not in seen:
                seen.add(key)
                edges.append([a, b])
    return nodes, edges


def force_layout(node_count: int, edges: list[list[int]]) -> np.ndarray:
    graph = nx.Graph()
    graph.add_nodes_from(range(node_count))
    graph.add_edges_from(edges)
    positions = nx.spring_layout(
        graph,
        seed=42,
        iterations=100,
        k=1 / np.sqrt(node_count),
        method="energy",
        gravity=1.0,
    )
    xy = np.array([positions[index] for index in range(node_count)])
    for axis in range(2):
        if xy[np.argmax(np.abs(xy[:, axis])), axis] < 0:
            xy[:, axis] *= -1
        low, high = np.quantile(xy[:, axis], [0.01, 0.99])
        xy[:, axis] = np.clip((xy[:, axis] - low) / (high - low), 0, 1)
    return xy


def build_region(region: str, source: Path, output: Path):
    folder = source / region
    if folder.exists():
        nodes_path, edges_path = folder / "nodes.csv", folder / "edges.csv"
    else:
        nodes_path = source / f"{region}-nodes.csv"
        edges_path = source / f"{region}-edges.csv"
    nodes, edges = read_graph(nodes_path, edges_path)
    positions = force_layout(len(nodes), edges)
    degrees = [0] * len(nodes)
    neighbors = [[] for _ in nodes]
    for source_index, target_index in edges:
        degrees[source_index] += 1
        degrees[target_index] += 1
        neighbors[source_index].append(target_index)
        neighbors[target_index].append(source_index)

    for index, node in enumerate(nodes):
        node.update({
            "degree": degrees[index],
            "x": round(float(positions[index, 0]), 6),
            "y": round(float(positions[index, 1]), 6),
        })

    quartiles = []
    for quartile in range(4):
        values = [degrees[i] for i, node in enumerate(nodes) if node["quartile"] == quartile]
        quartiles.append({
            "label": quartile,
            "count": len(values),
            "mean_degree": round(statistics.fmean(values), 2),
            "median_degree": statistics.median(values),
        })

    payload = {
        "meta": {
            "region": region,
            "display_name": REGIONS[region],
            "node_count": len(nodes),
            "edge_count": len(edges),
            "label_column": "activity_quartile",
            "layout": "normalized deterministic force-directed layout from undirected adjacency",
            "source_revision": REVISION,
        },
        "quartiles": quartiles,
        "nodes": nodes,
        "edges": edges,
    }
    (output / f"{region}.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    return {
        "region": region,
        "display_name": REGIONS[region],
        "nodes": len(nodes),
        "edges": len(edges),
        "classes": 4,
        "node_csv_sha256": sha256(nodes_path),
        "edge_csv_sha256": sha256(edges_path),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("dist/data/airports"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    summaries = [build_region(region, args.source, args.output) for region in REGIONS]
    manifest = {
        "dataset": "anomalypoint/NEExT",
        "subset": "airports",
        "revision": REVISION,
        "source_url": "https://huggingface.co/datasets/anomalypoint/NEExT",
        "license": "MIT (upstream struc2vec repository; see dataset card)",
        "graphs": summaries,
    }
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
