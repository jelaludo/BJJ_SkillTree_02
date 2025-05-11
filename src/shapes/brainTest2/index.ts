import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// Use the same coordinates as Brain Test for the outline
const BRAIN_TEST_COORDS = [
  { "x": 0.11666666666666667, "y": 0.4523809523809524 },
  { "x": 0.11666666666666667, "y": 0.35714285714285715 },
  { "x": 0.15, "y": 0.2619047619047619 },
  { "x": 0.21666666666666667, "y": 0.21428571428571427 },
  { "x": 0.2833333333333333, "y": 0.16666666666666666 },
  { "x": 0.4166666666666667, "y": 0.16666666666666666 },
  { "x": 0.55, "y": 0.11904761904761904 },
  { "x": 0.7166666666666667, "y": 0.16666666666666666 },
  { "x": 0.8166666666666667, "y": 0.2619047619047619 },
  { "x": 0.8833333333333333, "y": 0.35714285714285715 },
  { "x": 0.9166666666666666, "y": 0.5 },
  { "x": 0.85, "y": 0.5952380952380952 },
  { "x": 0.65, "y": 0.8333333333333334 },
  { "x": 0.55, "y": 0.7857142857142857 },
  { "x": 0.38333333333333336, "y": 0.5952380952380952 },
  { "x": 0.18333333333333332, "y": 0.5476190476190477 }
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

export function generateBrainTest2Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const outlineCount = Math.min(BRAIN_TEST_COORDS.length, Math.max(8, Math.floor(n * 0.25)));
  // Use evenly spaced outline points
  const outlineIdxs = Array.from({length: outlineCount}, (_, i) => Math.floor(i * BRAIN_TEST_COORDS.length / outlineCount));
  const outlinePoints = outlineIdxs.map(idx => BRAIN_TEST_COORDS[idx]);

  // Place outline nodes
  const nodePositions: NodePosition[] = outlinePoints.map((pt, i) => ({
    id: nodes[i].id,
    x: pt.x * width,
    y: pt.y * height,
    brightness: 0.7,
    neighbors: [nodes[(i+1)%outlinePoints.length].id], // connect to next outline node
    score: nodes[i].score,
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
      });
      count++;
    }
    tries++;
  }
  return nodePositions;
} 