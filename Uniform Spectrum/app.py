from flask import Flask, request, jsonify
import json
import networkx as nx
import os

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/generate-graph', methods=['POST'])
def generate_graph():
    data = request.json  # Assuming the input is JSON
    graph_type = data['graphType']
    
    # Dynamically call the NetworkX function
    # Default to a simple graph if the specified type is not found
    graph_function = getattr(nx, graph_type, nx.path_graph)
    
    # Some functions might require arguments, so handle those cases as needed
    if graph_type == 'complete_graph':
        graph = graph_function(6)  # Example: Complete graph with 6 nodes
    else:
        graph = graph_function()
    
    # Generate and save the graph as a JSON file
    graph_data = nx.node_link_data(graph)  # Convert to a format suitable for JSON
    json_path = os.path.join('static', 'graph.json')  # Save in static folder for Flask to serve
    with open(json_path, 'w') as f:
        json.dump(graph_data, f)
    
    response = {'message': 'Graph generated successfully', 'filePath': f'/static/graph.json'}
    return jsonify(response)


#this function will convert the ideal to json and incorporate the json structure of the associated graphs using graph_to_json_structure
def build_and_print_json(G):
    json_data = {'vertices': {}, 'edges': list(G.edges()), 'paths': {}}
    pos = nx.spring_layout(G)
    for node in G.nodes():
        json_data['vertices'][node] = {
            'position': {
                'x': pos[node][0],
                'y': pos[node][1]
            }
        }
    pairs_of_nodes = {(x,y) for x in G.nodes() for y in G.nodes() if x < y}
    for (x,y) in pairs_of_nodes:
        paths = nx.all_simple_paths(G, x, y)
        json_data['paths']['x-y'] = paths

    json_str = json.dumps(json_data, indent=2)
    with open('graph_data.json', 'w') as f:
        json.dump(json_data, f, indent=2)
