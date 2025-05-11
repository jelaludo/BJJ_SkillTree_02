import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// Kanji 力 (Chikara/Strength) - approximated as three main strokes
// We'll use three thick lines for the strokes
const STROKES = [
  // Main vertical stroke (left)
  { x1: 0.35, y1: 0.18, x2: 0.35, y2: 0.82 },
  // Top right-to-bottom-left stroke
  { x1: 0.35, y1: 0.5, x2: 0.75, y2: 0.18 },
  // Bottom right hook
  { x1: 0.55, y1: 0.65, x2: 0.82, y2: 0.82 },
];

export function generateChikaraLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  // Distribute nodes among the three strokes (proportional to stroke length)
  const lengths = STROKES.map(s => Math.hypot(s.x2 - s.x1, s.y2 - s.y1));
  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const counts = lengths.map(l => Math.round((l / totalLength) * n));
  // Adjust to ensure total is n
  let sum = counts.reduce((a, b) => a + b, 0);
  counts[0] += n - sum;

  let idx = 0;
  const points: NodePosition[] = [];
  for (let s = 0; s < STROKES.length; s++) {
    const { x1, y1, x2, y2 } = STROKES[s];
    for (let i = 0; i < counts[s] && idx < n; i++, idx++) {
      const t = (i + 1) / (counts[s] + 1); // avoid endpoints
      const x = width * (x1 + (x2 - x1) * t);
      const y = height * (y1 + (y2 - y1) * t);
      points.push({
        id: nodes[idx].id,
        x,
        y,
        brightness: 0.7,
        neighbors: [], // Optionally connect to previous/next on stroke
        score: nodes[idx].score,
      });
    }
  }
  // Optionally, connect each node to its nearest neighbor on the same stroke
  // (for now, just leave neighbors empty)
  return points;
} 