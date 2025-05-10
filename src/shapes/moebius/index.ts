// Moebius shape layout generator
import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// Helper: Map score (1-10) to brightness (0.3-1.0)
function scoreToBrightness(score: number) {
  return 0.3 + 0.7 * (score - 1) / 9;
}

// Helper: Map score (1-10) to node size (6-18px radius)
export function scoreToRadius(score: number) {
  return 6 + 12 * (score - 1) / 9;
}

// Moebius strip (figure-eight/infinity) 2D projection
export function generateMoebiusLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.32; // main loop radius
  const w = R * 0.22; // "strip" width
  const n = nodes.length;

  // Infinity symbol (lemniscate) with a twist
  // x = (R + w * cos(t/2)) * cos(t)
  // y = (R + w * cos(t/2)) * sin(t) * cos(t/2)
  return nodes.map((node, i) => {
    const t = (i / n) * 2 * Math.PI;
    const x = cx + (R + w * Math.cos(t / 2)) * Math.cos(t);
    const y = cy + (R + w * Math.cos(t / 2)) * Math.sin(t) * Math.cos(t / 2);
    const brightness = scoreToBrightness(node.score);
    return {
      id: node.id,
      x,
      y,
      brightness,
    };
  });
}

// Classic infinity symbol (lateral 8) layout
export function generateInfinityLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const cx = width / 2;
  const cy = height / 2;
  const A = Math.min(width, height) * 0.42; // horizontal radius
  const B = Math.min(width, height) * 0.19; // vertical radius
  const n = nodes.length;

  // x = A * cos(t), y = B * sin(2t)/2
  return nodes.map((node, i) => {
    const t = (i / n) * 2 * Math.PI;
    const x = cx + A * Math.cos(t);
    const y = cy + B * Math.sin(2 * t) / 1.2;
    const brightness = scoreToBrightness(node.score);
    return {
      id: node.id,
      x,
      y,
      brightness,
    };
  });
}

// Infinity 2: two concentric layers of nodes along the infinity symbol, with connections between layers
export function generateInfinity2Layout(nodes: SkillNode[], params: ShapeParams & { nodeSpace?: number }) {
  const { width, height, nodeSpace = 1.0 } = params;
  const cx = width / 2;
  const cy = height / 2;
  const A = Math.min(width, height) * 0.48; // wide
  const B = Math.min(width, height) * 0.19;

  // Split nodes evenly between two layers
  const n = Math.floor(nodes.length / 2);
  const innerNodes = nodes.slice(0, n);
  const outerNodes = nodes.slice(n, n * 2);
  const total = Math.min(innerNodes.length, outerNodes.length);

  const innerLayer = innerNodes.map((node, i) => {
    const t = (i / total) * 2 * Math.PI;
    const x = cx + A * Math.cos(t);
    const y = cy + B * Math.sin(2 * t) / 1.2;
    return {
      ...node,
      x,
      y,
      brightness: scoreToBrightness(node.score),
      layer: 'inner',
      pairIdx: i,
      neighbors: [] as string[],
    } as any;
  });

  const outerLayer = outerNodes.map((node, i) => {
    const t = (i / total) * 2 * Math.PI;
    const offset = nodeSpace * 1.1;
    const x = cx + (A + offset * 90) * Math.cos(t);
    const y = cy + (B + offset * 60) * Math.sin(2 * t) / 1.2;
    return {
      ...node,
      x,
      y,
      brightness: scoreToBrightness(node.score),
      layer: 'outer',
      pairIdx: i,
      neighbors: [] as string[],
    } as any;
  });

  // Connect each node to its next in the same layer (loop), and to its pair in the other layer
  for (let i = 0; i < total; i++) {
    // Inner layer connections
    innerLayer[i].neighbors = [
      innerLayer[(i + 1) % total].id,
      outerLayer[i].id,
    ];
    // Outer layer connections
    outerLayer[i].neighbors = [
      outerLayer[(i + 1) % total].id,
      innerLayer[i].id,
    ];
  }

  return [...innerLayer, ...outerLayer];
}

// Infinity 3: three concentric layers of nodes along the infinity symbol, each connected to its neighbors and corresponding nodes in adjacent layers
export function generateInfinity3Layout(nodes: SkillNode[], params: ShapeParams & { nodeSpace?: number }) {
  const { width, height, nodeSpace = 1.0 } = params;
  const cx = width / 2;
  const cy = height / 2;
  const A = Math.min(width, height) * 0.48;
  const B = Math.min(width, height) * 0.19;

  // Split nodes evenly between three layers
  const n = Math.floor(nodes.length / 3);
  const layer1 = nodes.slice(0, n);
  const layer2 = nodes.slice(n, 2 * n);
  const layer3 = nodes.slice(2 * n, 3 * n);
  const total = Math.min(layer1.length, layer2.length, layer3.length);

  const offsets = [0, nodeSpace * 1.1, nodeSpace * 2.2];
  const layers = [layer1, layer2, layer3].map((layer, li) =>
    layer.map((node, i) => {
      const t = (i / total) * 2 * Math.PI;
      const offset = offsets[li];
      const x = cx + (A + offset * 90) * Math.cos(t);
      const y = cy + (B + offset * 60) * Math.sin(2 * t) / 1.2;
      return {
        ...node,
        x,
        y,
        brightness: scoreToBrightness(node.score),
        layer: li,
        pairIdx: i,
        neighbors: [] as string[],
      } as any;
    })
  );

  // Connect each node to its next in the same layer (loop), and to its pair in adjacent layers
  for (let i = 0; i < total; i++) {
    // Layer 1
    layers[0][i].neighbors = [
      layers[0][(i + 1) % total].id,
      layers[1][i].id,
    ];
    // Layer 2
    layers[1][i].neighbors = [
      layers[1][(i + 1) % total].id,
      layers[0][i].id,
      layers[2][i].id,
    ];
    // Layer 3
    layers[2][i].neighbors = [
      layers[2][(i + 1) % total].id,
      layers[1][i].id,
    ];
  }

  return [...layers[0], ...layers[1], ...layers[2]];
} 