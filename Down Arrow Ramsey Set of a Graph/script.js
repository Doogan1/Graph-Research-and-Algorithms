
let currentGraph = {}

function spreadOutVerticesHorizontal(graphData, spacingMultiplier) {
    const svg = document.getElementById('graph-container');
    const viewBox = svg.viewBox.baseVal;
    const xCenter = graphData.vertices['0'].position.x;

    Object.keys(graphData.vertices).forEach((nodeId) => {
        //diagnostic console.log(graphData.vertices[nodeId].position.x);
        graphData.vertices[nodeId].position.x = (graphData.vertices[nodeId].position.x - xCenter) * spacingMultiplier + xCenter;
    });
    

    drawGraph(graphData, 'graph-container', false); // Redraw the graph with updated positions
}

const updateCurrentGraph = async () => {
    const graphSelector = document.getElementById('graph-select');
    const showRamseyBtn = document.getElementById('show-ramsey-btn');
    const selectedGraph = graphSelector.value;

    const parameterInputs = document.querySelectorAll('#parameter-container input');
    const parameterArr = [...parameterInputs].map(el => el.value);
    if (selectedGraph === "complete_graph") {
        showRamseyBtn.disabled = false;
        if (!parameterArr[0] || parameterArr[0] > 6 || parameterArr[0] < 2) {
            alert("Please enter an integer between 2 and 6");
            [...parameterInputs][0].value = "";
            return;
        } 
        const res = await fetch(`/graphs/${selectedGraph}_${parameterArr[0]}_data.json`);
        const graphData = await res.json();
        currentGraph[`graphData`] = graphData;
            //reset();
        drawGraph(graphData,'graph-container');
        //setInitialViewbox('graph-container');
        //drawGraph(graphData,'graph-container');
        attachClickHandlers(graphData);
    } else if (selectedGraph === "complete_bipartite_graph") {
        showRamseyBtn.disabled = true;
        if (!parameterArr[0] || !parameterArr[1]) {
            alert("Please enter both n and m.");
            [...parameterInputs][0].value = "";
            [...parameterInputs][1].value = "";
            return;
        }
        parameterArr.sort()

        if (parameterArr[0] < 1 || parameterArr[1] > 5) {
            alert("Please ensure 1 <= n,m <= 5");
            [...parameterInputs][0].value = "";
            [...parameterInputs][1].value = "";
            return;
        }
        if (parameterArr[0] === '5' && parameterArr[1] === '5') {
            // Show confirmation dialog
            const confirmShow = window.confirm("Showing the graph ideal with these parameters may result in a long (several minute) load time. Are you sure you want to continue?");
            if (!confirmShow) {
                // User did not confirm, exit the function early
                return;
            }
        }
        const res = await fetch(`Graph-Research-and-Algorithms/Down%20Arrow%20Ramsey%20Set%20of%20a%20Graph/graphs/complete_bipartite_graph_${parameterArr[0]}_${parameterArr[1]}_data.json`);
        const graphData = await res.json();
        currentGraph['graphData'] = graphData;
            //reset();
        drawGraph(graphData,'graph-container');
        //setInitialViewbox('graph-container');
        //drawGraph(graphData,'graph-container');
        attachClickHandlers(graphData);
        //setupZoomAndPan('graph-container');
    } else {
        showRamseyBtn.disabled = true;
        const res = await fetch(`/graphs/${selectedGraph}_data.json`);
        const graphData = await res.json();
        currentGraph['graphData'] = graphData;
            //reset();
        drawGraph(graphData,'graph-container');
        //setInitialViewbox('graph-container');
        //drawGraph(graphData,'graph-container');
        attachClickHandlers(graphData);
        //setupZoomAndPan('graph-container'); 
    }
};

const highlightTargets = (vertexId, graphData, svg) => {
    const toHighlight = new Set();

    const addTargets = currentId => {
        toHighlight.add(currentId);
        const targets = graphData.edges.filter(edge => edge[0] === currentId).map(edge => edge[1]);
        targets.forEach(target => {
            if (!toHighlight.has(target)) {
                addTargets(target);
            }
        });
    }

    addTargets(vertexId);

    toHighlight.forEach(id => {
        const vertex = svg.querySelector(`circle[data-key="${id}"]`);
        if (vertex) vertex.classList.add('active');
    });
} 

const normalizePositions = vertices => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.values(vertices).forEach(vertex => {
        minX = Math.min(minX, vertex.position.x);
        maxX = Math.max(maxX, vertex.position.x);
        minY = Math.min(minY, vertex.position.y);
        maxY = Math.max(maxY, vertex.position.y);
    });

    const width = Math.max(maxX - minX, 0.01);
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
    //diagnostic console.log(widestLevelCount);

    const conditionalWidth = svgId === 'associated-graph-container' ? viewBox.width : viewBox.width;
    const conditionalHeight = svgId === 'associated-graph-container' ? viewBox.height : viewBox.height;
    // Step 2: Calculate the Radius
    const radius = Math.min(conditionalWidth / (widestLevelCount * 2.5), 20); // Adjust as needed

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
        line.setAttribute('class', `line ${source}-${target}`);
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
        circle.setAttribute('id', key);

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
    //setInitialViewbox(svgId);
}
const parameterDiv = document.getElementById('parameter-container');

const graphFamilyParaSelect = (e) => {
    const selectedGraph = e.target.value;
    if (selectedGraph === 'complete_graph') {
        parameterDiv.innerHTML = `<p>Select an integer, n, from 2 to 6<p>
        <label for="complete-graph-parameter-1">n=<input id="complete-graph-parameter-1" type="number" min="2" max="6"/></label>
        `;
    } else if (selectedGraph === 'complete_bipartite_graph') {
        parameterDiv.innerHTML = `<p>Select integers n and m where</p>
        <p>1 <= n,m <= 5</p>
        <label for="complete-bipartite-graph-parameter-1">n=<input id="complete-bipartite-graph-parameter-1" type="number" min="1" max="5"/></label>

        <label for="complete-bipartite-graph-parameter-2">m=<input id="complete-bipartite-graph-parameter-2" type="number" min="1" max="5"/></label>
        `
    } else {
        parameterDiv.innerHTML = "";
    }
};

const attachClickHandlers = (graphData) => {
    const svg = document.getElementById('graph-container');
    const associatedGraphLabel = document.getElementById('associated-graph-container-label');
    const spreadHorizBtn = document.getElementById('spread-horizontal-btn');
    const ramseyBtn = document.getElementById('show-ramsey-btn');
    const horizSpacingSlider = document.getElementById('horiz-spacing-slider');
    const graphSelector = document.getElementById('graph-select');
    const parameterDiv = document.getElementById('parameter-div');
    const circles = document.querySelectorAll('.circle');
    const showGraphBtn = document.getElementById('show-graph-btn');

    /*
    horizSpacingSlider.addEventListener('input', () => {
        console.log(horizSpacingSlider.value);
        const spacingMultiplier = parseFloat(horizSpacingSlider.value);
        console.log(spacingMultiplier);
        spreadOutVerticesHorizontal(graphData, spacingMultiplier);
    });
    */
    /*
    spreadHorizBtn.addEventListener('click', event => {
        spreadOutVerticesHorizontal(graphData);
    });
    */

    ramseyBtn.addEventListener('click', () => {
        svg.querySelectorAll('circle').forEach(v => v.classList.remove('active'));
        const toHighlight = currentGraph['graphData'].ramsey_set;
        //diagnostic console.log(toHighlight);
        toHighlight.forEach(id => {
            const vertex = svg.querySelector(`circle[data-key="${id}"]`);
            if (vertex) vertex.classList.add('active');
        });
        //drawGraph(graphData, 'graph-container', false)
    })

    

    svg.addEventListener('click', event => {
        if (event.target && event.target.nodeName === 'circle') {
            const vertexKey = event.target.getAttribute('data-key');
            const associatedGraph = currentGraph.graphData.vertices[vertexKey].associated_graph;
            associatedGraphLabel.textContent = `The graph associated with vertex ${vertexKey}: `;
            drawGraph(associatedGraph, 'associated-graph-container');
            svg.querySelectorAll('circle').forEach(v => v.classList.remove('active'));
            event.target.classList.add('active');
        }

        if (event.target && event.target.nodeName === 'circle' && event.ctrlKey) {
            svg.querySelectorAll('circle').forEach(v => v.classList.remove('active'));

            const vertexId = event.target.getAttribute('data-key');
            highlightTargets(vertexId, graphData, svg);
        }
    });

    graphSelector.addEventListener('change', e => graphFamilyParaSelect(e))

    circles.forEach((circ) => {
        const topVtx = circ.getAttribute('data-key')
        const targets = graphData.edges.filter(edge => edge[0] === topVtx).map(edge => edge[1])
        const targetCircs = [...document.querySelectorAll('.circle')].filter(botCirc => targets.some(botVtx => botCirc.getAttribute('key-value') === botVtx));
        const targetEdges = [...document.querySelectorAll('.line')].filter(lin => targets.some(botVtx => lin.classList.contains(`${topVtx}-${botVtx}`)));
        circ.addEventListener('mouseenter', e => {
            targetEdges.forEach(lin => lin.classList.add('active'));
            targets.forEach(botVtx => document.getElementById(botVtx).classList.add('glow'));
        });
        circ.addEventListener('mouseleave', e => {
            targetEdges.forEach(lin => lin.classList.remove('active'));
            targets.forEach(botVtx => document.getElementById(botVtx).classList.remove('glow'));
        });
    });

    showGraphBtn.addEventListener('click', updateCurrentGraph);
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

const setInitialViewbox = (svgId) => {
    var svgElement = document.getElementById(svgId);
    var bbox = svgElement.getBBox(); // Get the bounding box of the SVG content

    // Calculate the viewBox values based on the bounding box
    var padding = 50; // Add some padding around the content
    var viewBoxValue = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;

    // Set the viewBox attribute
    svgElement.setAttribute('viewBox', viewBoxValue);
};

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('Graph-Research-and-Algorithms/Down%20Arrow%20Ramsey%20Set%20of%20a%20Graph/graphs/complete_graph_6_data.json');
    const graphData = await res.json();
    currentGraph['graphData'] = graphData;
    //diagnostic console.log(currentGraph['graphData']);
    drawGraph(graphData, 'graph-container');
    setInitialViewbox('graph-container');
    //drawGraph(graphData,'graph-container');
    attachClickHandlers(graphData);
    setupZoomAndPan('graph-container');
});
