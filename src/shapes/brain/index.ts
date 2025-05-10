import { SkillNode, NodePosition, ShapeParams } from '../../types/skill';

// --- Brain region geometry (single source of truth) ---
export function getBrainRegions(width: number, height: number) {
  // Left lobe: curve on top and left, flat on bottom and right
  const left = {
    cx: width * 0.36,
    cy: height * 0.36,
    r: width * 0.25,
    angleStart: Math.PI / 2, // top
    angleEnd: Math.PI, // left
  };
  // Right lobe: flat sides bottom and inside, curve on outer right/top
  const right = {
    cx: width * 0.64,
    cy: height * 0.36,
    r: width * 0.25 * 1.2,
    angleStart: Math.PI / 2, // down
    angleEnd: Math.PI, // left
  };
  // Band
  const band = {
    top: height * 0.41,
    bot: height * 0.58,
    left: width * 0.28,
    right: width * 0.72,
  };
  // Stem
  const stem = {
    top: { x: width * 0.52, y: height * 0.58 },
    right: { x: width * 0.60, y: height * 0.58 },
    bottom: { x: width * 0.56, y: height * 0.88 },
  };
  // Oblong
  const oblong = {
    cx: width * 0.5,
    cy: height * 0.48,
    rx: width * 0.13,
    ry: height * 0.09,
  };
  return { left, right, band, stem, oblong };
}

// --- Region checkers using the above geometry ---
function isInLeftLobe(x: number, y: number, reg: ReturnType<typeof getBrainRegions>["left"]) {
  const angle = Math.atan2(y - reg.cy, x - reg.cx);
  return (
    x < reg.cx + reg.r * 0.25 &&
    y < reg.cy + reg.r * 0.9 &&
    Math.pow(x - reg.cx, 2) + Math.pow(y - reg.cy, 2) <= reg.r * reg.r &&
    angle >= reg.angleStart && angle <= reg.angleEnd
  );
}
function isInRightLobe(x: number, y: number, reg: ReturnType<typeof getBrainRegions>["right"]) {
  const angle = Math.atan2(y - reg.cy, x - reg.cx);
  return (
    x > reg.cx - reg.r * 0.25 &&
    y < reg.cy + reg.r * 0.9 &&
    Math.pow(x - reg.cx, 2) + Math.pow(y - reg.cy, 2) <= reg.r * reg.r &&
    angle >= reg.angleStart &&
    angle <= reg.angleEnd
  );
}
function isInBand(x: number, y: number, reg: ReturnType<typeof getBrainRegions>["band"]) {
  return y >= reg.top && y <= reg.bot && x >= reg.left && x <= reg.right;
}
function isInStem(x: number, y: number, reg: ReturnType<typeof getBrainRegions>["stem"]) {
  const { top, right, bottom } = reg;
  const area = (top.x * (right.y - bottom.y) + right.x * (bottom.y - top.y) + bottom.x * (top.y - right.y)) / 2;
  const s = (top.x * (right.y - y) + right.x * (y - top.y) + x * (top.y - right.y)) / (2 * area);
  const t = (top.x * (y - bottom.y) + x * (bottom.y - top.y) + bottom.x * (top.y - y)) / (2 * area);
  const u = 1 - s - t;
  return s >= 0 && t >= 0 && u >= 0;
}
function isInOblong(x: number, y: number, reg: ReturnType<typeof getBrainRegions>["oblong"]) {
  return Math.pow((x - reg.cx) / reg.rx, 2) + Math.pow((y - reg.cy) / reg.ry, 2) <= 1;
}

// --- Node placement and export region for outline ---
export function generateBrainLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const regions = getBrainRegions(width, height);
  // Divide nodes among the five regions
  const nLeft = Math.round(n * 0.22);
  const nRight = Math.round(n * 0.25);
  const nBand = Math.round(n * 0.18);
  const nStem = Math.round(n * 0.15);
  const nOblong = n - nLeft - nRight - nBand - nStem;

  const points: { x: number; y: number; id: string; score: number; region: string }[] = [];
  let count = 0;
  // Left lobe (polar sampling)
  for (let i = 0; i < nLeft && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const r = regions.left.r * Math.sqrt(Math.random());
      const a = regions.left.angleEnd + (regions.left.angleStart - regions.left.angleEnd) * Math.random();
      const x = regions.left.cx + r * Math.cos(a);
      const y = regions.left.cy + r * Math.sin(a);
      if (isInLeftLobe(x, y, regions.left)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'left' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Right lobe (polar sampling)
  for (let i = 0; i < nRight && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const r = regions.right.r * Math.sqrt(Math.random());
      const a = regions.right.angleStart + (regions.right.angleEnd - regions.right.angleStart) * Math.random();
      const x = regions.right.cx + r * Math.cos(a);
      const y = regions.right.cy + r * Math.sin(a);
      if (isInRightLobe(x, y, regions.right)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'right' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Band
  for (let i = 0; i < nBand && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const x = regions.band.left + (regions.band.right - regions.band.left) * Math.random();
      const y = regions.band.top + (regions.band.bot - regions.band.top) * Math.random();
      if (isInBand(x, y, regions.band)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'band' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Stem
  for (let i = 0; i < nStem && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      // Barycentric sampling
      const s = Math.random();
      const t = Math.random() * (1 - s);
      const u = 1 - s - t;
      const x = s * regions.stem.top.x + t * regions.stem.right.x + u * regions.stem.bottom.x;
      const y = s * regions.stem.top.y + t * regions.stem.right.y + u * regions.stem.bottom.y;
      if (isInStem(x, y, regions.stem)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'stem' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Oblong
  for (let i = 0; i < nOblong && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const t = 2 * Math.PI * Math.random();
      const r = Math.sqrt(Math.random());
      const x = regions.oblong.cx + r * regions.oblong.rx * Math.cos(t);
      const y = regions.oblong.cy + r * regions.oblong.ry * Math.sin(t);
      if (isInOblong(x, y, regions.oblong)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'oblong' });
        count++;
        break;
      }
      tries++;
    }
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
    region: pt.region,
  }));
}

// --- Brain 2 region geometry ---
export function getBrain2Regions(width: number, height: number) {
  // Top half-oblong (ellipse, flat on bottom)
  const oblong = {
    cx: width * 0.5,
    cy: height * 0.38,
    rx: width * 0.32,
    ry: height * 0.22,
  };
  // Stem triangle (bottom right)
  const stem = {
    top: { x: width * 0.62, y: height * 0.60 },
    right: { x: width * 0.72, y: height * 0.88 },
    left: { x: width * 0.52, y: height * 0.88 },
  };
  return { oblong, stem };
}

function isInBrain2Oblong(x: number, y: number, reg: ReturnType<typeof getBrain2Regions>["oblong"]) {
  // Only top half (curve on top, flat on bottom)
  return (
    y <= reg.cy &&
    Math.pow((x - reg.cx) / reg.rx, 2) + Math.pow((y - reg.cy) / reg.ry, 2) <= 1
  );
}
function isInBrain2Stem(x: number, y: number, reg: ReturnType<typeof getBrain2Regions>["stem"]) {
  const { top, right, left } = reg;
  const area = (top.x * (right.y - left.y) + right.x * (left.y - top.y) + left.x * (top.y - right.y)) / 2;
  const s = (top.x * (right.y - y) + right.x * (y - top.y) + x * (top.y - right.y)) / (2 * area);
  const t = (top.x * (y - left.y) + x * (left.y - top.y) + left.x * (top.y - y)) / (2 * area);
  const u = 1 - s - t;
  return s >= 0 && t >= 0 && u >= 0;
}

export function generateBrain2Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const regions = getBrain2Regions(width, height);
  // Divide nodes: 80% in oblong, 20% in stem
  const nOblong = Math.round(n * 0.8);
  const nStem = n - nOblong;
  const points: { x: number; y: number; id: string; score: number; region: string }[] = [];
  let count = 0;
  // Oblong (top half-ellipse)
  for (let i = 0; i < nOblong && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const t = Math.PI * Math.random(); // [0, PI] for top half
      const r = Math.sqrt(Math.random());
      const x = regions.oblong.cx + r * regions.oblong.rx * Math.cos(t);
      const y = regions.oblong.cy + r * regions.oblong.ry * Math.sin(t);
      if (isInBrain2Oblong(x, y, regions.oblong)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'oblong' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Stem (triangle, bottom right)
  for (let i = 0; i < nStem && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      // Barycentric sampling
      const s = Math.random();
      const t = Math.random() * (1 - s);
      const u = 1 - s - t;
      const x = s * regions.stem.top.x + t * regions.stem.right.x + u * regions.stem.left.x;
      const y = s * regions.stem.top.y + t * regions.stem.right.y + u * regions.stem.left.y;
      if (isInBrain2Stem(x, y, regions.stem)) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'stem' });
        count++;
        break;
      }
      tries++;
    }
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
    region: pt.region,
  }));
}

// --- Brain 3: Circle region utilities ---
export function getBrain3RegionParams(width: number, height: number) {
  // Safe drawing area
  const marginTop = 80;
  const marginSide = 40;
  const marginBottom = 40;
  const drawX = marginSide;
  const drawY = marginTop;
  const drawWidth = width - 2 * marginSide;
  const drawHeight = height - marginTop - marginBottom;
  // Circle: center of safe area, radius fits inside
  const r = 0.48 * Math.min(drawWidth, drawHeight);
  const cx = drawX + drawWidth / 2;
  const cy = drawY + drawHeight / 2;
  return { cx, cy, r };
}

export function isInBrain3Region(x: number, y: number, params: { cx: number; cy: number; r: number }) {
  return Math.pow(x - params.cx, 2) + Math.pow(y - params.cy, 2) <= params.r * params.r;
}

export function getBrain3OutlinePoints(params: { cx: number; cy: number; r: number }, n: number = 120) {
  const points = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    points.push([
      params.cx + params.r * Math.cos(t),
      params.cy + params.r * Math.sin(t),
    ]);
  }
  return points;
}

export function generateBrain3Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const region = getBrain3RegionParams(width, height);
  const points: { x: number; y: number; id: string; score: number; region: string }[] = [];
  for (let i = 0; i < n; i++) {
    // Uniform sampling in circle
    const theta = 2 * Math.PI * Math.random();
    const r = region.r * Math.sqrt(Math.random());
    const x = region.cx + r * Math.cos(theta);
    const y = region.cy + r * Math.sin(theta);
    points.push({ x, y, id: nodes[i].id, score: nodes[i].score, region: 'circle' });
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
    region: pt.region,
  }));
} 