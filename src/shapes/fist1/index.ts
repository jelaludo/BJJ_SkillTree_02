import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// SVG path for the main fist shape (outer path)
export function getFist1Path(width: number, height: number): string {
  // The original SVG is 451x368
  const scale = Math.min(width / 451, height / 368);
  const translateX = (width - 451 * scale) / 2;
  const translateY = (height - 368 * scale) / 2;
  // Only use the outer path for the shape boundary
  return `M${0 * scale + translateX} ${0 * scale + translateY} C${148.83 * scale + translateX} ${0 * scale + translateY} ${297.66 * scale + translateX} ${0 * scale + translateY} ${451 * scale + translateX} ${0 * scale + translateY} C${451 * scale + translateX} ${121.44 * scale + translateY} ${451 * scale + translateX} ${242.88 * scale + translateY} ${451 * scale + translateX} ${368 * scale + translateY} C${302.17 * scale + translateX} ${368 * scale + translateY} ${153.34 * scale + translateX} ${368 * scale + translateY} ${0 * scale + translateX} ${368 * scale + translateY} C${0 * scale + translateX} ${246.56 * scale + translateY} ${0 * scale + translateX} ${125.12 * scale + translateY} ${0 * scale + translateX} ${0 * scale + translateY} Z`;
}

export function generateFist1Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;

  // Create a canvas to check if points are inside the path
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Draw the path
  const path = new Path2D(getFist1Path(width, height));
  ctx.fill(path);

  // Generate points within the fist shape
  const points: { x: number; y: number; id: string; score: number }[] = [];
  let count = 0;
  let tries = 0;
  const maxTries = 5000;

  while (count < n && tries < maxTries) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    if (ctx.isPointInPath(path, x, y)) {
      points.push({ x, y, id: nodes[count].id, score: nodes[count].score });
      count++;
    }
    tries++;
  }

  // Find k nearest neighbors for each node
  function findKNearest(nodes: { x: number; y: number; id: string }[], k: number) {
    return nodes.map((node, i) => {
      const dists = nodes.map((other, j) => ({
        id: other.id,
        dist: i === j ? Infinity : Math.hypot(node.x - other.x, node.y - other.y),
      }));
      dists.sort((a, b) => a.dist - b.dist);
      return dists.slice(0, k).map(d => d.id);
    });
  }

  const neighborIds = findKNearest(points, 3);

  return points.map((pt, i) => ({
    id: pt.id,
    x: pt.x,
    y: pt.y,
    brightness: 0.7,
    neighbors: neighborIds[i],
    score: pt.score,
  }));
} 