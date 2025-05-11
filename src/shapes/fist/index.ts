import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// Provided normalized coordinates for the fist shape
const FIST_COORDS = [
  { "x": 0.08333333333333333, "y": 0.16666666666666666 },
  { "x": 0.08333333333333333, "y": 0.11904761904761904 },
  { "x": 0.11666666666666667, "y": 0.11904761904761904 },
  { "x": 0.11666666666666667, "y": 0.07142857142857142 },
  { "x": 0.15, "y": 0.07142857142857142 },
  { "x": 0.18333333333333332, "y": 0.07142857142857142 },
  { "x": 0.21666666666666667, "y": 0.07142857142857142 },
  { "x": 0.25, "y": 0.07142857142857142 },
  { "x": 0.2833333333333333, "y": 0.07142857142857142 },
  { "x": 0.31666666666666665, "y": 0.07142857142857142 },
  { "x": 0.35, "y": 0.07142857142857142 },
  { "x": 0.38333333333333336, "y": 0.07142857142857142 },
  { "x": 0.4166666666666667, "y": 0.07142857142857142 },
  { "x": 0.45, "y": 0.07142857142857142 },
  { "x": 0.48333333333333334, "y": 0.07142857142857142 },
  { "x": 0.5166666666666667, "y": 0.07142857142857142 },
  { "x": 0.55, "y": 0.07142857142857142 },
  { "x": 0.5833333333333334, "y": 0.07142857142857142 },
  { "x": 0.6166666666666667, "y": 0.07142857142857142 },
  { "x": 0.65, "y": 0.07142857142857142 },
  { "x": 0.6833333333333333, "y": 0.07142857142857142 },
  { "x": 0.7166666666666667, "y": 0.07142857142857142 },
  { "x": 0.75, "y": 0.07142857142857142 },
  { "x": 0.7833333333333333, "y": 0.07142857142857142 },
  { "x": 0.8166666666666667, "y": 0.07142857142857142 },
  { "x": 0.85, "y": 0.11904761904761904 },
  { "x": 0.8833333333333333, "y": 0.11904761904761904 },
  { "x": 0.8833333333333333, "y": 0.16666666666666666 },
  { "x": 0.9166666666666666, "y": 0.16666666666666666 },
  { "x": 0.9166666666666666, "y": 0.21428571428571427 },
  { "x": 0.95, "y": 0.21428571428571427 },
  { "x": 0.95, "y": 0.2619047619047619 },
  { "x": 0.95, "y": 0.30952380952380953 },
  { "x": 0.95, "y": 0.35714285714285715 },
  { "x": 0.95, "y": 0.40476190476190477 },
  { "x": 0.95, "y": 0.4523809523809524 },
  { "x": 0.95, "y": 0.5 },
  { "x": 0.95, "y": 0.5476190476190477 },
  { "x": 0.95, "y": 0.5952380952380952 },
  { "x": 0.95, "y": 0.6428571428571429 },
  { "x": 0.9166666666666666, "y": 0.6428571428571429 },
  { "x": 0.9166666666666666, "y": 0.6904761904761905 },
  { "x": 0.8833333333333333, "y": 0.6904761904761905 },
  { "x": 0.85, "y": 0.6904761904761905 },
  { "x": 0.8166666666666667, "y": 0.6904761904761905 },
  { "x": 0.7833333333333333, "y": 0.6428571428571429 },
  { "x": 0.75, "y": 0.6428571428571429 },
  { "x": 0.75, "y": 0.5952380952380952 },
  { "x": 0.7166666666666667, "y": 0.5952380952380952 },
  { "x": 0.7166666666666667, "y": 0.5476190476190477 },
  { "x": 0.75, "y": 0.40476190476190477 },
  { "x": 0.7833333333333333, "y": 0.40476190476190477 },
  { "x": 0.7833333333333333, "y": 0.35714285714285715 },
  { "x": 0.8166666666666667, "y": 0.35714285714285715 },
  { "x": 0.8166666666666667, "y": 0.30952380952380953 },
  { "x": 0.7833333333333333, "y": 0.30952380952380953 },
  { "x": 0.7833333333333333, "y": 0.2619047619047619 },
  { "x": 0.75, "y": 0.2619047619047619 },
  { "x": 0.7166666666666667, "y": 0.2619047619047619 },
  { "x": 0.7166666666666667, "y": 0.30952380952380953 },
  { "x": 0.6833333333333333, "y": 0.30952380952380953 },
  { "x": 0.6833333333333333, "y": 0.35714285714285715 },
  { "x": 0.65, "y": 0.35714285714285715 },
  { "x": 0.65, "y": 0.40476190476190477 },
  { "x": 0.65, "y": 0.4523809523809524 },
  { "x": 0.6166666666666667, "y": 0.5 },
  { "x": 0.6166666666666667, "y": 0.5476190476190477 },
  { "x": 0.6166666666666667, "y": 0.5952380952380952 },
  { "x": 0.65, "y": 0.5952380952380952 },
  { "x": 0.65, "y": 0.6428571428571429 },
  { "x": 0.65, "y": 0.6904761904761905 },
  { "x": 0.6833333333333333, "y": 0.6904761904761905 },
  { "x": 0.6833333333333333, "y": 0.7380952380952381 },
  { "x": 0.7166666666666667, "y": 0.7380952380952381 },
  { "x": 0.75, "y": 0.7380952380952381 },
  { "x": 0.75, "y": 0.7857142857142857 },
  { "x": 0.7833333333333333, "y": 0.7857142857142857 },
  { "x": 0.8166666666666667, "y": 0.7857142857142857 },
  { "x": 0.8166666666666667, "y": 0.8333333333333334 },
  { "x": 0.85, "y": 0.8333333333333334 },
  { "x": 0.85, "y": 0.8809523809523809 },
  { "x": 0.8166666666666667, "y": 0.8809523809523809 },
  { "x": 0.8166666666666667, "y": 0.9285714285714286 },
  { "x": 0.7833333333333333, "y": 0.9285714285714286 },
  { "x": 0.75, "y": 0.9285714285714286 },
  { "x": 0.7166666666666667, "y": 0.9285714285714286 },
  { "x": 0.6833333333333333, "y": 0.9285714285714286 },
  { "x": 0.6833333333333333, "y": 0.8809523809523809 },
  { "x": 0.65, "y": 0.8809523809523809 },
  { "x": 0.65, "y": 0.8333333333333334 },
  { "x": 0.6166666666666667, "y": 0.8333333333333334 },
  { "x": 0.5833333333333334, "y": 0.8333333333333334 },
  { "x": 0.5833333333333334, "y": 0.7857142857142857 },
  { "x": 0.55, "y": 0.7857142857142857 },
  { "x": 0.55, "y": 0.7380952380952381 },
  { "x": 0.5166666666666667, "y": 0.7380952380952381 },
  { "x": 0.48333333333333334, "y": 0.7380952380952381 },
  { "x": 0.48333333333333334, "y": 0.6904761904761905 },
  { "x": 0.45, "y": 0.6904761904761905 },
  { "x": 0.45, "y": 0.6428571428571429 },
  { "x": 0.4166666666666667, "y": 0.6428571428571429 },
  { "x": 0.38333333333333336, "y": 0.6428571428571429 },
  { "x": 0.35, "y": 0.6428571428571429 },
  { "x": 0.31666666666666665, "y": 0.6428571428571429 },
  { "x": 0.31666666666666665, "y": 0.5952380952380952 },
  { "x": 0.2833333333333333, "y": 0.5952380952380952 },
  { "x": 0.25, "y": 0.5952380952380952 },
  { "x": 0.25, "y": 0.5476190476190477 },
  { "x": 0.21666666666666667, "y": 0.5476190476190477 },
  { "x": 0.21666666666666667, "y": 0.5 },
  { "x": 0.18333333333333332, "y": 0.5 },
  { "x": 0.15, "y": 0.5 },
  { "x": 0.11666666666666667, "y": 0.5 },
  { "x": 0.08333333333333333, "y": 0.5 },
  { "x": 0.08333333333333333, "y": 0.4523809523809524 },
  { "x": 0.08333333333333333, "y": 0.40476190476190477 },
  { "x": 0.08333333333333333, "y": 0.35714285714285715 },
  { "x": 0.08333333333333333, "y": 0.30952380952380953 },
  { "x": 0.08333333333333333, "y": 0.2619047619047619 },
  { "x": 0.7833333333333333, "y": 0.4523809523809524 },
  { "x": 0.8166666666666667, "y": 0.4523809523809524 },
  { "x": 0.85, "y": 0.4523809523809524 },
  { "x": 0.8833333333333333, "y": 0.4523809523809524 },
  { "x": 0.8833333333333333, "y": 0.5 },
  { "x": 0.85, "y": 0.5 },
  { "x": 0.85, "y": 0.5476190476190477 },
  { "x": 0.8166666666666667, "y": 0.5476190476190477 },
  { "x": 0.8166666666666667, "y": 0.5952380952380952 },
  { "x": 0.7833333333333333, "y": 0.5952380952380952 },
  { "x": 0.7833333333333333, "y": 0.5476190476190477 },
  { "x": 0.75, "y": 0.5476190476190477 },
  { "x": 0.75, "y": 0.5 }
];

// Ray-casting point-in-polygon
function isInPolygon(x: number, y: number, poly: {x: number, y: number}[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-8) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function generateFistLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  // Minimal outline: 20% of nodes or at least 10, but not more than FIST_COORDS.length
  const outlineCount = Math.min(FIST_COORDS.length, Math.max(10, Math.floor(n * 0.2)));
  const outlineIdxs = Array.from({length: outlineCount}, (_, i) => Math.floor(i * FIST_COORDS.length / outlineCount));
  const outlinePoints = outlineIdxs.map(idx => FIST_COORDS[idx]);

  // Place outline nodes
  const nodePositions: NodePosition[] = outlinePoints.map((pt, i) => ({
    id: nodes[i].id,
    x: pt.x * width,
    y: pt.y * height,
    brightness: 0.7,
    neighbors: [nodes[(i+1)%outlinePoints.length].id], // connect to next outline node
    score: nodes[i].score,
    size: 8,
    color: '#8B0000'
  }));

  // Place the rest randomly inside the polygon
  let count = outlinePoints.length;
  let tries = 0;
  const maxTries = 5000;
  while (count < n && tries < maxTries) {
    const rx = Math.random();
    const ry = Math.random();
    if (isInPolygon(rx, ry, outlinePoints)) {
      nodePositions.push({
        id: nodes[count].id,
        x: rx * width,
        y: ry * height,
        brightness: 0.7,
        neighbors: [],
        score: nodes[count].score,
        size: 5,
        color: '#8B0000'
      });
      count++;
    }
    tries++;
  }

  // --- CONNECTIONS ---
  // 1) Outline nodes: already connected in a loop. Now, connect each to only 1 random inside node.
  const insideStart = outlinePoints.length;
  const insideNodes = nodePositions.slice(insideStart);
  for (let i = 0; i < outlinePoints.length; i++) {
    const outlineNode = nodePositions[i];
    if (insideNodes.length > 0) {
      const idx = Math.floor(Math.random() * insideNodes.length);
      const insideNode = insideNodes[idx];
      if (!outlineNode.neighbors.includes(insideNode.id)) {
        outlineNode.neighbors.push(insideNode.id);
      }
      if (!insideNode.neighbors.includes(outlineNode.id)) {
        insideNode.neighbors.push(outlineNode.id);
      }
    }
  }

  // 2) Inside nodes: create 4 major hubs, all other inside nodes attach to 1 hub and at most 1 other non-hub (nearest neighbor)
  const numHubs = 4;
  const shuffled = insideNodes.slice().sort(() => Math.random() - 0.5);
  const hubs = shuffled.slice(0, numHubs);
  const hubIds = new Set(hubs.map(h => h.id));

  // Connect all non-hub inside nodes to up to maxInsideConnections nearby hubs (within a strict pixel threshold)
  const maxInsideConnections = typeof params.maxInsideConnections === 'number' ? params.maxInsideConnections : 1;
  const PROXIMAL_DISTANCE = 80; // pixels
  for (const node of insideNodes) {
    if (hubIds.has(node.id)) continue;
    // Find all hubs within the threshold
    const nearbyHubs = hubs.filter(hub => {
      const dx = node.x - hub.x;
      const dy = node.y - hub.y;
      return Math.sqrt(dx * dx + dy * dy) < PROXIMAL_DISTANCE;
    });
    if (nearbyHubs.length > 0 && maxInsideConnections > 0) {
      // Sort by distance and connect to up to maxInsideConnections closest hubs
      nearbyHubs.sort((a, b) => {
        const da = (a.x - node.x) ** 2 + (a.y - node.y) ** 2;
        const db = (b.x - node.x) ** 2 + (b.y - node.y) ** 2;
        return da - db;
      });
      for (let i = 0; i < Math.min(maxInsideConnections, nearbyHubs.length); i++) {
        const chosenHub = nearbyHubs[i];
        if (!node.neighbors.includes(chosenHub.id)) node.neighbors.push(chosenHub.id);
        if (!chosenHub.neighbors.includes(node.id)) chosenHub.neighbors.push(node.id);
      }
    }
    // If no hub is close enough, node remains unconnected to a hub
  }

  return nodePositions;
} 