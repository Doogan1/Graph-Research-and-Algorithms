
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
import json

#We first define a utility function that takes a list of graphs and produces
#a list of graphs which represent the distinct isomorphism classes of the given list of graphs
#one can take note that it is defined recursively and is computationally expensive due to the
#is_isomorphic function

#takes a list of graphs L and an empty array E.  The array E will eventually be returned when the unique graphs under graph isomorphism is built
def graphs_to_reps(L, E):
    if len(L) == 0:
        return E
    S = L.copy()
    s = len(S)
    for i in range(0,s-1):
        #if the last element of the array is isomorphic to any of the graphs before it, then pop it off and call the function with the shorter list S
        if nx.is_isomorphic(S[i], S[-1]):
            #diagnostic print(f"Popping off the graph {str(S[i])} because {str(S[i])} is isomorphic to {str(S[-1])}.")
            G = S.pop()
            return graphs_to_reps(S,E)
        #if this point is reached, it means the last element is a representative of an isomorphism class distinct from any others already represented
        #so we can safely place it in our array of distinct representatives E
    G = S.pop()
    #diagnostic print(f"Popping off the graph {str(G)} and adding it to the list of unique representatives.")
    E.append(G)
    #now we have reduced the length of S by 1 in this case as well, so we can call the function again on the shorter array.
    #E is behaving as storage across function calls.
    return graphs_to_reps(S,E)

#here is another utility function which takes a graph G and produces a list of the (not necessarily distinct) edge deleted subgraphs of g

def edge_deleted_subgraphs(G):
    L = []
    for e in G.edges():
        H = G.copy()
        H.remove_edge(e[0],e[1])
        L.append(H)
    return L

#uncomment the following code for an example use of the above two functions and the effect of their combination
"""
G = nx.petersen_graph()

L1 = edge_deleted_subgraphs(G)

L = graphs_to_reps(edge_deleted_subgraphs(G))

for H in L:
    print(str(H))
"""
#Takes a graph and a list of graphs and returns true if g is isomorphic to a graph h in the list
#L is a list of pairs of graphs in the list together with the vertex they are associated with in the poset of graphs
#this is to be used in a later function, so it's okay if one does not understand now what exactly is the function of L
"""
def Iso_Check_List(G, L): 
    for p in L:
        if nx.is_isomorphic(p[0], G):
            return (True, p[1])
    return (False, nx.empty_graph(0))
"""

def is_iso_any_list(G, L, return_index = True):
    i = 0
    for H in L:
        if nx.is_isomorphic(G,H):
            if return_index:
                return [True, i]
            else:
                return True
        i += 1
    if return_index:
        return [False, i]
    else:
        return False

def are_isomorphic(G,H):
    return nx.is_isomorphic(G,H)

#the boolean function in the argument of the following function should operate on the values of the attribute key and return True or False
def contract_if(G, u, v, attribute_key, boolean_function):
    attr_val_u = G.nodes[u].get(attribute_key)
    attr_val_v = G.nodes[v].get(attribute_key)

    if boolean_function(attr_val_u, attr_val_v):
        G = nx.contracted_nodes(G, u, v, self_loops=False)
    
    return G
    
    

#the code below is a reminder of node attributes and demonstrates that one can set node attributes to be graphs themselves,
#this will be of use in the next function which returns a poset (represented here as a graph) whose node attributes are graphs

"""
G = nx.empty_graph(0)

for i in range(2,6):
    H = nx.complete_graph(i)
    G.add_node(str(i), graph=H)

graphs = nx.get_node_attributes(G, "graph")
for v in G.nodes():
    print(graphs[v])
"""

#looks at each of the nodes representing graphs of size m and generates new nodes representing the edge deleted subgraphs of the node
#then it merges the nodes representing graphs of size m-1 based on graph isomorphism
def Graph_Ideal(G, D, m):
    n = G.order()
    #diagnostic print(m)
    if m == 0: #this corresponds to the last level of the poset.  when we get here, we are done and we can return the poset of graphs D
        return D
    if D.order() == 0: #this is the first thing that will happen when this function is called as D will be an empty graph to begin with
        D.add_node("0", graph = G)
        return Graph_Ideal(G, D, G.size())
    i = 0
    graphs = nx.get_node_attributes(D, "graph") #graphs is a dictionary of "vtxName":associatedGraph, this is used to obtain the graph which is acting as a label of the node in D
    #diagnostic print([data for node, data in D.nodes(data=True)])
    current_level_nodes = [node for node, data in D.nodes(data=True) if data["graph"].size() == m]
    next_level_nodes_and_graphs = []
    for u in current_level_nodes:
        H = graphs[u]
        next_level_u_graphs = graphs_to_reps(edge_deleted_subgraphs(H), [])
        #diagnostic print(f"There are {len(next_level_u_graphs)} next level graphs coming from vertex {u} before paring")
        for F in next_level_u_graphs:
            [is_iso, j] = is_iso_any_list(F, [p[1] for p in next_level_nodes_and_graphs])
            if is_iso:
                iso_node = next_level_nodes_and_graphs[j][0]
                D.add_edge(u, iso_node)
            else:
                new_node = u + "-" + str(i)
                D.add_node(new_node, graph=F)
                D.add_edge(u, new_node)
                i += 1
                next_level_nodes_and_graphs.append([new_node, F])
    return Graph_Ideal(G,D,m-1) #decrease m to work on the next level of the poset

#this function will help us visualize the resulting digraph
def calculate_positions(graph):
    positions = {}
    levels = {}  # Keeps track of the number of nodes at each level

    for node in graph.nodes():
        level = node.count('-') + 1  # Determine level by string length
        if level not in levels:
            levels[level] = 0
        positions[node] = (levels[level], -level * 10)  # X position is based on how many nodes are already at this level, Y is negative level
        levels[level] += 1  # Increment count of nodes at this level

    # Center align nodes in each level
    max_width = max(levels.values())
    for node, (x, y) in positions.items():
        level_width = levels[node.count('-') + 1]
        offset = (max_width - level_width) / 2
        positions[node] = (x + offset, y)
    return positions

#this function takes a networkX graph and turns it into a json object
#graph={vertices, edges}, where vertices has the form vertex: {position: {x,y}} and edges has the form {[source, target]}
def graph_to_json_structure(G):
    vertices = {}
    pos_dict = nx.spring_layout(G)
    for u in G.nodes():
        vertices[u] = {'position': {'x': pos_dict[u][0],'y': pos_dict[u][1]}}
    
    edges = list(G.edges())
    return {'vertices': vertices, 'edges': edges}

#this function will convert the ideal to json and incorporate the json structure of the associated graphs using graph_to_json_structure
def build_and_print_json(P):
    json_data = {'vertices': {}, 'edges': list(P.edges())}
    pos = calculate_positions(P)
    for node, data in P.nodes(data=True):
        nested_graph = data['graph']
        json_data['vertices'][node] = {
            'position': {
                'x': pos[node][0],
                'y': pos[node][1]
            },
            'associated_graph': graph_to_json_structure(nested_graph)
        }

    json_str = json.dumps(json_data, indent=2)
    with open('graph_data.json', 'w') as f:
        json.dump(json_data, f, indent=2)


#get_targets will get the set of nodes of P corresponding to the ideal generated by the graph associated with the given vertex (node_id).  
#targets is the memory between recursive calls.  pass in emtpy list initially.
        
def get_targets(node_id, targets, P):
    targets.append(node_id)
    new_targets = [edge[1] for edge in P.edges() if edge[0] == node_id]
    for target in new_targets:
        if target not in targets:
            get_targets(target, targets, P)
    return targets



#P is the graph ideal generated by a graph G, and H is a subgraph of G.  
#graph_to_node finds which node's associated graph is isomorphic to H and returns it
def graph_to_node(H, P):
    m = H.size()
    n = H.order()
    graphs = nx.get_node_attributes(P, 'graph')
    right_size_nodes = [node for node in P.nodes() if node.count('-') == (n * (n-1) / 2) - m]
    for node in right_size_nodes:
        if nx.is_isomorphic(H, graphs[node]):
            return node

#this should take in a complete graph G and return the down arrow Ramsey set of the graph.
#this is restricted to complete graphs for now to avoid the nonuniqueness of relative complements in other graphs 

def down_arrow_ramsey_set(G):
    P = Graph_Ideal(G, nx.DiGraph(), 1) #P is the graph ideal generated by G
    graphs = nx.get_node_attributes(P, 'graph')
    colorings = []
    for node in P.nodes():
        comp_node = graph_to_node(nx.complement(graphs[node]), P)
        #diagnostic print(f"the node that is complement to {node} is {comp_node}")
        ideal_node = set(get_targets(node, [], P))
        ideal_comp_node = set(get_targets(comp_node, [], P))
        #diagnostic print(f"the targets of {node} are {ideal_node} and the targets of its complement {comp_node} are {ideal_comp_node}")
        coloring = ideal_node.union(ideal_comp_node)
        #diagnostic print(f"About to add {coloring} to the list of colorings")
        colorings.append(coloring)
    for i in range(0,len(colorings) - 1):
        ideal = colorings[0]
        coloring = colorings.pop()
        #diagnostic print(f"About to intersect {ideal} and {coloring}")
        colorings[0] = ideal.intersection(coloring)
    return colorings[0]
