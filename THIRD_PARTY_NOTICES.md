# Third-party notices

Files in `dist/data/airports/` reproduce or derive from the `airports` subset of [`anomalypoint/NEExT`](https://huggingface.co/datasets/anomalypoint/NEExT), pinned revision `36114f8da77d4fe5b4700a7ff2673b15901a6caf`.

The NEExT dataset card identifies the upstream airport networks as originating from the `leoribeiro/struc2vec` repository and lists the subset license as MIT. Retain this notice and the original citation when redistributing the data:

Ribeiro, L. F. R., Savarese, P. H. P., & Figueiredo, D. R. (2017). *struc2vec: Learning Node Representations from Structural Identity*. Proceedings of the 23rd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining.

Repository: https://github.com/leoribeiro/struc2vec

Changes in the browser JSON: CSV parsing, undirected edge normalization, degree calculation, deterministic force-directed coordinates, numeric rounding, and display metadata. The source node IDs and `activity_quartile` labels remain available in the copied CSVs.
