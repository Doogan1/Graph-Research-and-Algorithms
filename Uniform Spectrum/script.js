const normalizePositions = vertices => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.values(vertices).forEach(vertex => {
        minX = Math.min(minX, vertex.position.x);
        maxX = Math.max(maxX, vertex.position.x);
        minY = Math.min(minY, vertex.position.y);
        maxY = Math.max(maxY, vertex.position.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // Normalize positions
    Object.values(vertices).forEach(vertex => {
        vertex.position.x = 0.1 + 0.8 * (vertex.position.x - minX) / width;
        vertex.position.y = 0.05 + 0.9 * (vertex.position.y - minY) / height;
    });
}

const drawGraph = (graphData, svgId, normalize = true) => {
    const svg = document.getElementById(svgId);
    const vertices = graphData.vertices;
    const edges = graphData.edges;
    const viewBox = svg.viewBox.baseVal;

    //Define marker to be used in the directed graph
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '5');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#666'); // Arrow color

    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    //if (normalize) {
     //   normalizePositions(vertices);
    //}
    //console.log(vertices);

    normalizePositions(vertices);

    const levels = {}; // Map to hold the y-values and vertices on that level
    Object.entries(vertices).forEach(([key, value]) => {
        const y = value.position.y;
        if (!levels[y]) {
            levels[y] = [];
        }
        levels[y].push(key);
    });

    const widestLevelCount = Math.max(...Object.values(levels).map(level => level.length));

    const conditionalWidth = svgId === 'associated-graph-container' ? svg.clientWidth : viewBox.width;
    const conditionalHeight = svgId === 'associated-graph-container' ? svg.clientHeight : viewBox.height;
    // Step 2: Calculate the Radius
    const radius = conditionalWidth / (widestLevelCount * 2.5); // Adjust as needed

    svg.innerHTML = '';
    
    const vtxRad = svgId === 'associated-graph-container' ? 10 : radius;
    // Draw edges
    edges.forEach(edge => {
        const [source, target] = edge;
        const x1 = vertices[source].position.x * conditionalWidth; // Scale position to SVG size
        const y1 = (1 - vertices[source].position.y) * conditionalHeight;
        const x2 = vertices[target].position.x * conditionalWidth;
        const y2 = (1 - vertices[target].position.y) * conditionalHeight;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', 'line');
        line.setAttribute('marker-end', 'url(#arrowhead)');

        svg.appendChild(line);
    });

        

    // Draw vertices
    for (const [key, value] of Object.entries(vertices)) {
        const cx = value.position.x * conditionalWidth; // Scale position to SVG size
        const cy = (1 - value.position.y) * conditionalHeight;


        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx );
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', vtxRad); // Radius of the circle
        circle.setAttribute('class', 'circle');
        circle.setAttribute('data-key', key); // Store node key in data-key attribute

        svg.appendChild(circle);

        // Create the text for the vertex ID
        /*
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx);
        text.setAttribute('y', cy);
        text.setAttribute('dy', '.3em'); // Adjust vertical alignment
        text.setAttribute('text-anchor', 'middle'); // Center the text horizontally
        text.setAttribute('class', 'vertex-id'); // Use this class to style the text if desired
        text.textContent = key; // Set the vertex ID as text content
                
        svg.appendChild(text);
        */
    }
}




function setupZoomAndPan(svgId) {
    const svg = document.getElementById(svgId);
    let zoomLevel = 1; // Initial zoom level
    const zoomSensitivity = 0.1; // Adjust this value to change zoom speed
    let isPanning = false;
    let startPoint = {x: 0, y: 0};
    let endPoint = {x: 0, y: 0};
    let viewBox = {x: 0, y: 0, width: svg.clientWidth, height: svg.clientHeight};

    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);

    svg.addEventListener('wheel', event => {
        event.preventDefault(); // Prevent the page from scrolling

    const delta = event.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
    const zoomFactor = 1 - delta; // Calculate the zoom factor based on the wheel movement
    zoomLevel *= zoomFactor; // Update the zoom level based on the zoom factor
    zoomLevel = Math.min(Math.max(zoomLevel, 0.1), 10); // Restrict zoom level between 0.1x and 10x

    // Calculate where the cursor is relative to the SVG (as a percentage)
    const cursorXPercent = event.offsetX / svg.clientWidth;
    const cursorYPercent = event.offsetY / svg.clientHeight;

    // Calculate the change in width and height of the viewBox based on the zoom factor
    const widthChange = viewBox.width * (1 - zoomFactor);
    const heightChange = viewBox.height * (1 - zoomFactor);

    // Adjust newX and newY to center the zoom on the cursor position
    // The adjustment is smaller, making the change in viewBox position smoother
    const newX = viewBox.x + (widthChange * cursorXPercent);
    const newY = viewBox.y + (heightChange * cursorYPercent);

    // Update the viewBox with the new dimensions and position
    viewBox = {
        x: newX,
        y: newY,
        width: viewBox.width - widthChange,
        height: viewBox.height - heightChange
    };

    svg.setAttribute('viewBox', `${newX} ${newY} ${viewBox.width} ${viewBox.height}`);
});

    svg.addEventListener('mousedown', event => {
        isPanning = true;
        startPoint = {x: event.clientX, y: event.clientY};
    });

    svg.addEventListener('mousemove', event => {
        if (isPanning) {
            endPoint = {x: event.clientX, y: event.clientY};
            const dx = (endPoint.x - startPoint.x) / svg.clientWidth * viewBox.width;
            const dy = (endPoint.y - startPoint.y) / svg.clientHeight * viewBox.height;
            const newX = viewBox.x - dx;
            const newY = viewBox.y - dy;

            svg.setAttribute('viewBox', `${newX} ${newY} ${viewBox.width} ${viewBox.height}`);
            startPoint = {x: event.clientX, y: event.clientY};
            viewBox.x = newX;
            viewBox.y = newY;
        }
    });

    svg.addEventListener('mouseup', () => {
        isPanning = false;
    });

    svg.addEventListener('mouseleave', () => {
        isPanning = false;
    });
}

const updateCurrentGraph = async () => {
    const selectedGraph = graphSelector.value;
    const parameterInputs = document.querySelectorAll('#parameter-container input');
    const parameterArr = [...parameterInputs].map(el => el.value);
    if (selectedGraph === "complete_graph") {
        if (!parameterArr[0]) {
            alert("Please enter an integer between 1 and 29");
            return;
        }
        gameState.currentGraph = `complete_graph_${parameterArr[0]}`;
    } else if (selectedGraph === "complete_bipartite_graph") {
        gameState.currentGraph = `complete_bipartite_graph_${parameterArr[0]}_${parameterArr[1]}`;
    } else {
       gameState.currentGraph = selectedGraph; 
    }
    await reset();
    await drawGraph();
};


const graphFamilyParaSelect = (e) => {
    const selectedGraph = e.target.value;
    if (selectedGraph === 'complete_graph') {
        parameterDiv.innerHTML = `<label for="complete-graph-parameter-1">n=<input id="complete-graph-parameter-1" type="number" /></label>
        `;
    } else if (selectedGraph === 'complete_bipartite_graph') {
        parameterDiv.innerHTML = `<label for="complete-bipartite-graph-parameter-1">n=<input id="complete-bipartite-graph-parameter-1" type="number" /></label>

        <label for="complete-bipartite-graph-parameter-2">m=<input id="complete-bipartite-graph-parameter-2" type="number" /></label>
        `
    } else {
        parameterDiv.innerHTML = "";
    }
};

const attachClickHandlers = (graphData) => {
    const svg = document.getElementById('graph-container');
    const graphBtn = document.getElementById('show-graph-btn');
    const showBtn = document.getElementById('show-unispect-btn');
    const playBtn = document.getElementById('play-btn');
    const graphSelect = document.getElementById('graph-select');

    graphSelect.addEventListener('change', e => graphFamilyParaSelect(e));
    
    showBtn.addEventListener('click', () => {
        var graphType = this.value;
            fetch('/generate-graph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({graphType: graphType}),
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                fetch('graph_data.json')
                .then(response => response.json())
                .then(jsonData => console.log(jsonData));
                // Here, fetch the new/updated JSON file based on `data.filePath`
                // For example:
                // fetch(data.filePath).then(response => response.json()).then(jsonData => console.log(jsonData));
            })
            .catch(error => {
                console.error('Error:', error);
            });
    });

    svg.addEventListener('click', event => {
        if (event.target && event.target.nodeName === 'circle') {
            const vertexKey = event.target.getAttribute('data-key');
            
            event.target.classList.add('active');
        }

        if (event.target && event.target.nodeName === 'circle' && event.ctrlKey) {
            svg.querySelectorAll('circle').forEach(v => v.classList.remove('active'));
            const vertexId = event.target.getAttribute('data-key');
            
        }
    });
}
/*
document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('graph_data.json');
    const graphData = await res.json();
    drawGraph(graphData, 'graph-container');
    attachClickHandlers(graphData);
    setupZoomAndPan('graph-container');
});
*/
