import networkx as nx
import numpy as np

#We first define a utility function that takes a list of graphs and produces
#a list of graphs which represent the distinct isomorphism classes of the given list of graphs
#one can take note that it is defined recursively and is computationally expensive due to the
#is_isomorphic function

#takes a list of graphs L and an empty array E.  The array E will eventually be returned when the unique graphs under graph isomorphism is built
def graphs_to_reps(L, E=[]):
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
def Iso_Check_List(G, L): 
    for p in L:
        if nx.is_isomorphic(p[0], G):
            return (True, p[1])
    return (False, nx.empty_graph(0))

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


def Graph_Ideal(G, D, m):
    n = G.order()
    print(m)
    if m == 0: #this corresponds to the last level of the poset.  when we get here, we are done and we can return the poset of graphs D
        return D
    if D.order() == 0: #this is the first thing that will happen when this function is called as D will be an empty graph to begin with
        D.add_node("0", graph = G)
        return Graph_Ideal(G, D, G.size())
    #similar to the iso_check_list function, L will be a set of pairs of graph together with label
    L= []
    i = 0
    graphs = nx.get_node_attributes(D, "graph") #graphs is a dictionary of "vtxName":associatedGraph, this is used to obtain the graph which is acting as a label of the node in D
    D_copy = D.copy()
    for v in D_copy.nodes():
        graph = graphs[v] #graph is the graph corresponding to node v in D
        if graph.size() == m: #let's only look at the graphs that match the "level" that we are on
            T = graphs_to_reps(edge_deleted_subgraphs(graph)) #get the distinct edge deleted subgraphs up to isomorphism
            for G in T:
                #it is possible (and likely) that another graph of size m has an edge deleted subgraph which is isomorphic to an edge deleted subgraph of the current graph.  so, we need to filter these out as well.
                is_copy = Iso_Check_List(G,L)[0]
                label = Iso_Check_List(G,L)[1]
                #if G is distinct from the graphs already "contained" in D, we will add a new vertex to D and store the graph G as the label of that vertex
                if not is_copy:
                    D.add_node(v + str(i), graph=G) 
                    D.add_edge(v,v+str(i))
                    L.append((G,v+str(i)))  # add it to L so that we can check against it later
                else: #so, if G is isomorphic to a graph already appearing in D, then add an edge between this vertex and the vertex representing G
                    D.add_edge(v,label)
                i+=1
    return Graph_Ideal(G,D,m-1) #decrease m to work on the next level of the poset

G = nx.complete_graph(5)

P = Graph_Ideal(G, nx.DiGraph(), 1)

graphs = nx.get_node_attributes(P, "graph")

nx.draw(graphs["0"])


    