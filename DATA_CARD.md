# Data card — NEExT airport networks

## Scope

- **Domain:** air transportation / airport networks
- **Graphs:** Brazil, Europe, and USA (three independent networks)
- **Nodes:** airports represented by dataset node IDs
- **Edges:** undirected commercial flight-route relationships
- **Node attribute:** `activity_quartile`, four classes encoded as raw labels 0–3
- **Intended task:** airport activity-level node classification / structural-role exploration

| Graph | Nodes | Edges | Classes | Isolated nodes |
|---|---:|---:|---:|---:|
| Brazil | 131 | 1,003 | 4 | 0 |
| Europe | 399 | 5,993 | 4 | 0 |
| USA | 1,190 | 13,599 | 4 | 0 |

## Source and license

- Dataset: [`anomalypoint/NEExT`](https://huggingface.co/datasets/anomalypoint/NEExT), `airports` subset.
- Pinned revision: `36114f8da77d4fe5b4700a7ff2673b15901a6caf`.
- Dataset card attribution: upstream files from the `leoribeiro/struc2vec` repository; airport subset license listed as MIT.
- Citation: Ribeiro, Savarese, and Figueiredo. *struc2vec: Learning Node Representations from Structural Identity*. KDD 2017.

## Source fields and derived fields

The copied source tables preserve `node_id`, `activity_quartile`, `src_node_id`, and `dest_node_id`. Browser JSON adds `degree`, `x`, and `y`. Degree is counted from unique undirected edges. Coordinates are a deterministic normalized force-directed layout derived from adjacency and are not geographic coordinates.

The interface presents raw labels 0–3 as Q1–Q4 for readability. It always shows the raw label alongside the display label; the source values are unchanged in downloads.

## Limitations

- Node IDs are identifiers, not IATA/ICAO airport codes.
- Airport names, countries/cities, latitude/longitude, passenger volume, flight frequency, route direction, distance, carrier, and time are not included.
- Edges establish a route relationship only; they do not establish current service, traffic volume, causality, or operational importance.
- Spatial proximity in the diagram comes from topology, so it must not be interpreted as geographic distance.
- Degree is only one structural measure. A larger node is not automatically a more important airport for every domain task.
- The class label is supplied by the dataset. This visualization does not independently validate how activity quartiles were constructed.

## Responsible extension

Any join to airport names, coordinates, or current schedules should document its source, date, identifier matching, missing records, and licensing. Current operational claims require a time-stamped transportation source rather than this benchmark alone.
