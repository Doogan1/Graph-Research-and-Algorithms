import networkx as nx
import numpy as np
from functools import reduce

def uniform_spectrum(G):
    node_set = G.nodes()
    pairs_of_nodes = {(x,y) for x in node_set for y in node_set if x < y}
    paths = {}
    for (u,v) in pairs_of_nodes:
        paths[(u,v)] = set(map(len,list(nx.all_simple_paths(G, u, v))))
    return list(map(lambda a: a-1,reduce(lambda a, b: b.intersection(a),paths.values())))