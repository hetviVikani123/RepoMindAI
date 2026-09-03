from __future__ import annotations

import networkx as nx


def build_graph(nodes: list[dict], edges: list[dict]) -> nx.DiGraph:
    graph = nx.DiGraph()

    for node in nodes:
        graph.add_node(node["id"], **node)

    for edge in edges:
        graph.add_edge(edge["source"], edge["target"], relation=edge.get("relation", "uses"))

    return graph
