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

  // Helper: random intensity, 1-10, with lower chance for 10
  function randomIntensity() {
    const r = Math.random();
    if (r > 0.97) return 10;
    if (r > 0.90) return 9;
    if (r > 0.80) return 8;
    if (r > 0.65) return 7;
    if (r > 0.50) return 6;
    if (r > 0.35) return 5;
    if (r > 0.25) return 4;
    if (r > 0.15) return 3;
    if (r > 0.07) return 2;
    return 1;
  }

  type FNode = NodePosition & { region: string, intensity: number };
  const points: FNode[] = [];
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
        const intensity = randomIntensity();
        points.push({
          x, y,
          id: nodes[count].id,
          score: nodes[count].score,
          region: 'left',
          brightness: 0.4 + 0.6 * (intensity / 10),
          neighbors: [],
          color: '#3bb0e0',
          size: 8,
          intensity
        });
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
        const intensity = randomIntensity();
        points.push({
          x, y,
          id: nodes[count].id,
          score: nodes[count].score,
          region: 'right',
          brightness: 0.4 + 0.6 * (intensity / 10),
          neighbors: [],
          color: '#3bb0e0',
          size: 8,
          intensity
        });
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
        const intensity = randomIntensity();
        points.push({
          x, y,
          id: nodes[count].id,
          score: nodes[count].score,
          region: 'band',
          brightness: 0.4 + 0.6 * (intensity / 10),
          neighbors: [],
          color: '#3bb0e0',
          size: 8,
          intensity
        });
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
      const s = Math.random();
      const t = Math.random() * (1 - s);
      const u = 1 - s - t;
      const x = s * regions.stem.top.x + t * regions.stem.right.x + u * regions.stem.bottom.x;
      const y = s * regions.stem.top.y + t * regions.stem.right.y + u * regions.stem.bottom.y;
      if (isInStem(x, y, regions.stem)) {
        const intensity = randomIntensity();
        points.push({
          x, y,
          id: nodes[count].id,
          score: nodes[count].score,
          region: 'stem',
          brightness: 0.4 + 0.6 * (intensity / 10),
          neighbors: [],
          color: '#3bb0e0',
          size: 8,
          intensity
        });
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
        const intensity = randomIntensity();
        points.push({
          x, y,
          id: nodes[count].id,
          score: nodes[count].score,
          region: 'oblong',
          brightness: 0.4 + 0.6 * (intensity / 10),
          neighbors: [],
          color: '#3bb0e0',
          size: 8,
          intensity
        });
        count++;
        break;
      }
      tries++;
    }
  }

  // Build k-nearest neighbors within each region
  function findKNearest(nodes: FNode[], k: number) {
    return nodes.map((node, i) => {
      const dists = nodes.map((other, j) => ({
        id: other.id,
        dist: i === j ? Infinity : Math.hypot(node.x - other.x, node.y - other.y),
      }));
      dists.sort((a, b) => a.dist - b.dist);
      return dists.slice(0, k).map(d => d.id);
    });
  }

  const leftNodes = points.filter(p => p.region === 'left');
  const rightNodes = points.filter(p => p.region === 'right');
  const bandNodes = points.filter(p => p.region === 'band');
  const stemNodes = points.filter(p => p.region === 'stem');
  const oblongNodes = points.filter(p => p.region === 'oblong');

  const leftNeighbors = findKNearest(leftNodes, 3);
  const rightNeighbors = findKNearest(rightNodes, 3);
  const bandNeighbors = findKNearest(bandNodes, 3);
  const stemNeighbors = findKNearest(stemNodes, 3);
  const oblongNeighbors = findKNearest(oblongNodes, 3);

  leftNodes.forEach((n, i) => n.neighbors = leftNeighbors[i]);
  rightNodes.forEach((n, i) => n.neighbors = rightNeighbors[i]);
  bandNodes.forEach((n, i) => n.neighbors = bandNeighbors[i]);
  stemNodes.forEach((n, i) => n.neighbors = stemNeighbors[i]);
  oblongNodes.forEach((n, i) => n.neighbors = oblongNeighbors[i]);

  // Force-directed simulation (Fruchterman-Reingold style)
  const ITER = 100;
  const AREA = width * height;
  const k = Math.sqrt(AREA / n) * 0.6;

  function keepInRegion(node: FNode) {
    switch (node.region) {
      case 'left':
        if (!isInLeftLobe(node.x, node.y, regions.left)) {
          const r = regions.left.r * Math.sqrt(Math.random());
          const a = regions.left.angleEnd + (regions.left.angleStart - regions.left.angleEnd) * Math.random();
          node.x = regions.left.cx + r * Math.cos(a);
          node.y = regions.left.cy + r * Math.sin(a);
        }
        break;
      case 'right':
        if (!isInRightLobe(node.x, node.y, regions.right)) {
          const r = regions.right.r * Math.sqrt(Math.random());
          const a = regions.right.angleStart + (regions.right.angleEnd - regions.right.angleStart) * Math.random();
          node.x = regions.right.cx + r * Math.cos(a);
          node.y = regions.right.cy + r * Math.sin(a);
        }
        break;
      case 'band':
        if (!isInBand(node.x, node.y, regions.band)) {
          node.x = regions.band.left + (regions.band.right - regions.band.left) * Math.random();
          node.y = regions.band.top + (regions.band.bot - regions.band.top) * Math.random();
        }
        break;
      case 'stem':
        if (!isInStem(node.x, node.y, regions.stem)) {
          const s = Math.random();
          const t = Math.random() * (1 - s);
          const u = 1 - s - t;
          node.x = s * regions.stem.top.x + t * regions.stem.right.x + u * regions.stem.bottom.x;
          node.y = s * regions.stem.top.y + t * regions.stem.right.y + u * regions.stem.bottom.y;
        }
        break;
      case 'oblong':
        if (!isInOblong(node.x, node.y, regions.oblong)) {
          const t = 2 * Math.PI * Math.random();
          const r = Math.sqrt(Math.random());
          node.x = regions.oblong.cx + r * regions.oblong.rx * Math.cos(t);
          node.y = regions.oblong.cy + r * regions.oblong.ry * Math.sin(t);
        }
        break;
    }
  }

  for (let iter = 0; iter < ITER; iter++) {
    // Repulsion
    for (let i = 0; i < points.length; i++) {
      let dx = 0, dy = 0;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        if (points[i].region !== points[j].region) continue; // only intra-region repulsion
        let vx = points[i].x - points[j].x;
        let vy = points[i].y - points[j].y;
        let dist = Math.sqrt(vx * vx + vy * vy) + 0.01;
        let rep = (k * k) / dist;
        dx += (vx / dist) * rep;
        dy += (vy / dist) * rep;
      }
      points[i].x += dx * 0.002;
      points[i].y += dy * 0.002;
    }

    // Attraction (edges)
    for (let i = 0; i < points.length; i++) {
      const node = points[i];
      for (const nid of node.neighbors) {
        const other = points.find(n => n.id === nid);
        if (!other) continue;
        let vx = other.x - node.x;
        let vy = other.y - node.y;
        let dist = Math.sqrt(vx * vx + vy * vy) + 0.01;
        // Attraction is stronger for higher intensity
        let attr = ((dist * dist) / k) * (1 + 0.5 * (node.intensity === 10 ? 2 : node.intensity / 10));
        node.x += (vx / dist) * attr * 0.0015;
        node.y += (vy / dist) * attr * 0.0015;
      }
      keepInRegion(node);
    }
  }

  // Return as NodePosition[]
  return points.map(({ region, intensity, ...rest }) => rest);
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
  // Semicircle: center at top of safe area, radius fits inside
  const r = 0.48 * Math.min(drawWidth, drawHeight * 0.7); // leave room for stem
  const cx = drawX + drawWidth / 2;
  const cy = drawY + r; // center at top
  // Triangle stem: right angle at (cx + r, cy), pointy end at bottom right
  const triRight = { x: cx + r, y: cy };
  const triBottom = { x: drawX + drawWidth * 0.92, y: drawY + drawHeight * 0.98 };
  const triLeft = { x: cx + r * 0.55, y: cy + r * 0.65 };
  const triangle = { right: triRight, bottom: triBottom, left: triLeft };
  return { cx, cy, r, triangle };
}

export function isInBrain3Region(x: number, y: number, params: ReturnType<typeof getBrain3RegionParams>) {
  // In semicircle (top half)
  const inSemi = y <= params.cy && Math.pow(x - params.cx, 2) + Math.pow(y - params.cy, 2) <= params.r * params.r;
  // In triangle (barycentric)
  const { right, bottom, left } = params.triangle;
  const area = (right.x * (bottom.y - left.y) + bottom.x * (left.y - right.y) + left.x * (right.y - bottom.y)) / 2;
  const s = (right.x * (bottom.y - y) + bottom.x * (y - right.y) + x * (right.y - bottom.y)) / (2 * area);
  const t = (right.x * (y - left.y) + x * (left.y - right.y) + left.x * (right.y - y)) / (2 * area);
  const u = 1 - s - t;
  const inTri = s >= 0 && t >= 0 && u >= 0;
  return { inSemi, inTri };
}

export function getBrain3OutlinePoints(params: ReturnType<typeof getBrain3RegionParams>, n: number = 120) {
  const points = [];
  // Top half-circle: t in [0, PI]
  for (let i = 0; i <= n; i++) {
    const t = Math.PI * i / n;
    points.push([
      params.cx + params.r * Math.cos(t),
      params.cy + params.r * Math.sin(t),
    ]);
  }
  // Flat bottom (right to left)
  points.push([params.cx - params.r, params.cy]);
  points.push([params.cx + params.r, params.cy]);
  points.push([params.cx + params.r, params.cy]); // close path
  // Triangle stem
  const { right, bottom, left } = params.triangle;
  const tri = [
    [right.x, right.y],
    [bottom.x, bottom.y],
    [left.x, left.y],
    [right.x, right.y],
  ];
  return { semicircle: points, triangle: tri };
}

export function generateBrain3Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const region = getBrain3RegionParams(width, height);
  const nSemi = Math.round(n * 0.8);
  const nTri = n - nSemi;
  const points: { x: number; y: number; id: string; score: number; region: string }[] = [];
  let count = 0;
  // Semicircle (top half)
  for (let i = 0; i < nSemi && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      const theta = Math.PI * Math.random(); // [0, PI]
      const r = region.r * Math.sqrt(Math.random());
      const x = region.cx + r * Math.cos(theta);
      const y = region.cy + r * Math.sin(theta);
      if (y <= region.cy && Math.pow(x - region.cx, 2) + Math.pow(y - region.cy, 2) <= region.r * region.r) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'semicircle' });
        count++;
        break;
      }
      tries++;
    }
  }
  // Triangle
  const { right, bottom, left } = region.triangle;
  for (let i = 0; i < nTri && count < n; i++) {
    let tries = 0;
    while (tries < 100) {
      // Barycentric sampling
      const s = Math.random();
      const t = Math.random() * (1 - s);
      const u = 1 - s - t;
      const x = s * right.x + t * bottom.x + u * left.x;
      const y = s * right.y + t * bottom.y + u * left.y;
      // Check inside triangle
      const area = (right.x * (bottom.y - left.y) + bottom.x * (left.y - right.y) + left.x * (right.y - bottom.y)) / 2;
      const s2 = (right.x * (bottom.y - y) + bottom.x * (y - right.y) + x * (right.y - bottom.y)) / (2 * area);
      const t2 = (right.x * (y - left.y) + x * (left.y - right.y) + left.x * (right.y - y)) / (2 * area);
      const u2 = 1 - s2 - t2;
      if (s2 >= 0 && t2 >= 0 && u2 >= 0) {
        points.push({ x, y, id: nodes[count].id, score: nodes[count].score, region: 'triangle' });
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

// --- Brain4-SVGPolygon ---
// Example polygon: a simple brain-like shape (replace with real SVG points as needed)
export function getBrain4Polygon(width: number, height: number): [number, number][] {
  // Define a polygon in normalized coordinates (0-1), then scale to fit safe area
  const marginTop = 80;
  const marginSide = 40;
  const marginBottom = 40;
  const drawX = marginSide;
  const drawY = marginTop;
  const drawWidth = width - 2 * marginSide;
  const drawHeight = height - marginTop - marginBottom;
  // Anatomical: smaller, higher main lobes, rectangular cerebellum, long stem
  const normPoly = [
    // Main lobes (smaller, rounder, higher)
    [0.22, 0.28], // left
    [0.36, 0.13], // top left
    [0.50, 0.08], // top center
    [0.64, 0.13], // top right
    [0.78, 0.28], // right

    // Cerebellum (rectangle, bottom right)
    [0.82, 0.70], // top left of cerebellum
    [0.92, 0.70], // top right of cerebellum
    [0.92, 0.90], // bottom right of cerebellum
    [0.82, 0.90], // bottom left of cerebellum

    // Connect to main lobe bottom right
    [0.68, 0.70], // bottom right of main lobe

    // Stem (long, thin, bottom center/left)
    [0.54, 0.70], // bottom center right of main lobe
    [0.54, 1.08], // stem bottom right (extends below 1.0 for extra length)
    [0.46, 1.08], // stem bottom left
    [0.46, 0.70], // bottom center left of main lobe

    // Connect to main lobe bottom left
    [0.32, 0.70], // bottom left of main lobe

    // Close path
    [0.22, 0.28],
  ];
  return normPoly.map(([nx, ny]) => [drawX + nx * drawWidth, drawY + ny * drawHeight]);
}

// Ray-casting point-in-polygon
export function isInBrain4Polygon(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-8) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getBrain4PolygonOutlinePoints(width: number, height: number) {
  return getBrain4Polygon(width, height);
}

export function generateBrain4SVGPolygonLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const poly = getBrain4Polygon(width, height);
  const points: { x: number; y: number; id: string; score: number; region: string }[] = [];
  let count = 0;
  // Fill the polygon with random points
  const minX = Math.min(...poly.map(p => p[0]));
  const maxX = Math.max(...poly.map(p => p[0]));
  const minY = Math.min(...poly.map(p => p[1]));
  const maxY = Math.max(...poly.map(p => p[1]));
  while (points.length < n) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if (isInBrain4Polygon(x, y, poly)) {
      points.push({ x, y, id: nodes[points.length].id, score: nodes[points.length].score, region: 'svgpoly' });
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

// --- Brain SVG 2 implementation ---
export function getBrainSVG2Path(width: number, height: number): string {
  // Scale and transform the original SVG path to fit our dimensions
  const scale = Math.min(width, height) / 931.843;
  const translateX = (width - 931.843 * scale) / 2;
  const translateY = (height - 931.843 * scale) / 2;
  
  return `M${926.932 * scale + translateX},${305.137 * scale + translateY} 
    c${12.301 * scale},${-38.3 * scale},${1.4 * scale},${-86.6 * scale},${-32 * scale},${-124 * scale} 
    c${-14.5 * scale},${-16.2 * scale},${-31.4 * scale},${-28.5 * scale},${-49.199 * scale},${-36.5 * scale} 
    c${-5.1 * scale},${-8.4 * scale},${-11.201 * scale},${-16.6 * scale},${-18.1 * scale},${-24.4 * scale} 
    c${-29.9 * scale},${-33.5 * scale},${-69.4 * scale},${-51.5 * scale},${-105.701 * scale},${-51.7 * scale} 
    c${-25.4 * scale},${-19.5 * scale},${-59.699 * scale},${-34.3 * scale},${-98.699 * scale},${-40.4 * scale} 
    c${-30.7 * scale},${-4.8 * scale},${-60.3 * scale},${-3.6 * scale},${-86.2 * scale},${2.4 * scale} 
    c${-22.5 * scale},${-9.8 * scale},${-49 * scale},${-13.8 * scale},${-76.8 * scale},${-10.3 * scale} 
    c${-28.899 * scale},${3.7 * scale},${-54.5 * scale},${14.9 * scale},${-74.1 * scale},${31 * scale} 
    c${-31 * scale},${-14 * scale},${-70.9 * scale},${-14.8 * scale},${-108.9 * scale},${0.9 * scale} 
    c${-32.7 * scale},${13.5 * scale},${-57.8 * scale},${36.5 * scale},${-72 * scale},${63 * scale} 
    c${-25.4 * scale},${5.6 * scale},${-51.1 * scale},${19.1 * scale},${-73 * scale},${40.1 * scale} 
    c${-31.1 * scale},${29.8 * scale},${-47.5 * scale},${68 * scale},${-47.4 * scale},${102.8 * scale} 
    c${-37.8 * scale},${21 * scale},${-61.8 * scale},${57.1 * scale},${-60.1 * scale},${95.6 * scale} 
    c${-10.1 * scale},${15.4 * scale},${-17.7 * scale},${33.5 * scale},${-21.7 * scale},${53.4 * scale} 
    c${-6.9 * scale},${34.5 * scale},${-1.7 * scale},${67.899 * scale},${12.3 * scale},${94.3 * scale} 
    c${-1 * scale},${58.3 * scale},${31.7 * scale},${108.6 * scale},${80.9 * scale},${118.4 * scale} 
    c${3.2 * scale},${0.6 * scale},${6.4 * scale},${1.1 * scale},${9.6 * scale},${1.399 * scale} 
    c${-1.7 * scale},${12.101 * scale},${-1.5 * scale},${24.4 * scale},${1 * scale},${36.7 * scale} 
    c${14.1 * scale},${71.1 * scale},${95.7 * scale},${114.8 * scale},${182.3 * scale},${97.6 * scale} 
    c${3.899 * scale},${-0.8 * scale},${7.8 * scale},${-1.699 * scale},${11.6 * scale},${-2.699 * scale} 
    l0,0 c${12.9 * scale},${20.699 * scale},${39.7 * scale},${11.8 * scale},${39.7 * scale},${11.8 * scale} 
    v${76.6 * scale} c0,${8.2 * scale},${3.1 * scale},${16 * scale},${8.8 * scale},${22 * scale} 
    l${42.4 * scale},${44.7 * scale} c${9.899 * scale},${10.5 * scale},${27.5 * scale},${3.4 * scale},${27.5 * scale},${-11 * scale} 
    v${-86.6 * scale} c${2.6 * scale},${-78.101 * scale},${31.3 * scale},${-116.7 * scale},${55.8 * scale},${-131.4 * scale} 
    c${33 * scale},${-19.9 * scale},${32.5 * scale},${-61.3 * scale},${32.3 * scale},${-76.4 * scale} 
    c${26 * scale},${13.7 * scale},${67.101 * scale},${21.5 * scale},${101.5 * scale},${17.601 * scale} 
    c${155.199 * scale},${-17.9 * scale},${163.299 * scale},${-122.3 * scale},${168.4 * scale},${-139.4 * scale} 
    c${45.299 * scale},${3.4 * scale},${86.898 * scale},${-15.8 * scale},${104.898 * scale},${-52.7 * scale} 
    c${2.5 * scale},${-5.199 * scale},${4.5 * scale},${-10.6 * scale},${5.9 * scale},${-16 * scale} 
    c${15 * scale},${-8.899 * scale},${27.301 * scale},${-21.6 * scale},${35.1 * scale},${-37.6 * scale} 
    C${933.633 * scale + translateX},${352.737 * scale + translateY},${934.332 * scale + translateX},${328.337 * scale + translateY},${926.932 * scale + translateX},${305.137 * scale + translateY}z`;
}

export function generateBrainSVG2Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  
  // Create a canvas to check if points are inside the path
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Draw the path
  const path = new Path2D(getBrainSVG2Path(width, height));
  ctx.fill(path);
  
  // Generate points within the brain shape
  const points: { x: number; y: number; id: string; score: number }[] = [];
  let count = 0;
  const maxTries = 1000;
  
  while (count < n && maxTries > 0) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    
    // Check if point is inside the path
    if (ctx.isPointInPath(path, x, y)) {
      points.push({ x, y, id: nodes[count].id, score: nodes[count].score });
      count++;
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
  }));
}

// --- Top Down Brain View ---
export function generateTopDownBrainLayout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const gap = width * 0.06; // fixed gap between lobes
  const lobeWidth = (width - gap) / 2 * 0.96;
  const lobeHeight = height * 0.92;
  const cxL = width / 2 - gap / 2 - lobeWidth / 2;
  const cxR = width / 2 + gap / 2 + lobeWidth / 2;
  const cy = height / 2;
  const nLeft = Math.floor(n / 2);
  const nRight = n - nLeft;
  // Helper: sample inside ellipse
  function sampleEllipse(cx: number, cy: number, rx: number, ry: number): [number, number] {
    let x = 0, y = 0;
    let tries = 0;
    do {
      const t = 2 * Math.PI * Math.random();
      const r = Math.sqrt(Math.random());
      x = cx + rx * r * Math.cos(t);
      y = cy + ry * r * Math.sin(t);
      tries++;
    } while (tries < 10 && (Math.abs(x - width / 2) < gap / 2)); // ensure not in gap
    return [x, y];
  }
  // Helper: random intensity, 1-10, with lower chance for 10
  function randomIntensity() {
    const r = Math.random();
    if (r > 0.97) return 10;
    if (r > 0.90) return 9;
    if (r > 0.80) return 8;
    if (r > 0.65) return 7;
    if (r > 0.50) return 6;
    if (r > 0.35) return 5;
    if (r > 0.25) return 4;
    if (r > 0.15) return 3;
    if (r > 0.07) return 2;
    return 1;
  }
  // Place nodes, assign lobe and intensity
  type FNode = NodePosition & { lobe: 'left' | 'right', intensity: number };
  const points: FNode[] = [];
  for (let i = 0; i < nLeft; i++) {
    const [x, y] = sampleEllipse(cxL, cy, lobeWidth / 2, lobeHeight / 2);
    const intensity = randomIntensity();
    points.push({
      id: nodes[i].id,
      x,
      y,
      brightness: 0.4 + 0.6 * (intensity / 10),
      neighbors: [],
      score: nodes[i].score,
      color: '#3bb0e0',
      size: 8,
      lobe: 'left',
      intensity
    });
  }
  for (let i = 0; i < nRight; i++) {
    const [x, y] = sampleEllipse(cxR, cy, lobeWidth / 2, lobeHeight / 2);
    const intensity = randomIntensity();
    points.push({
      id: nodes[nLeft + i].id,
      x,
      y,
      brightness: 0.4 + 0.6 * (intensity / 10),
      neighbors: [],
      score: nodes[nLeft + i].score,
      color: '#3bb0e0',
      size: 8,
      lobe: 'right',
      intensity
    });
  }
  // Build k-nearest neighbors (k=3) within each lobe
  function findKNearest(nodes: FNode[], k: number) {
    return nodes.map((node, i) => {
      const dists = nodes.map((other, j) => ({
        id: other.id,
        dist: i === j ? Infinity : Math.hypot(node.x - other.x, node.y - other.y),
      }));
      dists.sort((a, b) => a.dist - b.dist);
      return dists.slice(0, k).map(d => d.id);
    });
  }
  const leftNodes = points.filter(p => p.lobe === 'left');
  const rightNodes = points.filter(p => p.lobe === 'right');
  const leftNeighbors = findKNearest(leftNodes, 3);
  const rightNeighbors = findKNearest(rightNodes, 3);
  leftNodes.forEach((n, i) => n.neighbors = leftNeighbors[i]);
  rightNodes.forEach((n, i) => n.neighbors = rightNeighbors[i]);
  // Force-directed simulation (Fruchterman-Reingold style)
  const ITER = 100;
  const AREA = width * height;
  const k = Math.sqrt(AREA / n) * 0.6;
  function keepInEllipse(node: FNode) {
    const cx = node.lobe === 'left' ? cxL : cxR;
    const rx = lobeWidth / 2, ry = lobeHeight / 2;
    let dx = node.x - cx, dy = node.y - cy;
    if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) > 1) {
      const angle = Math.atan2(dy, dx);
      node.x = cx + rx * Math.cos(angle);
      node.y = cy + ry * Math.sin(angle);
    }
    // Prevent crossing the gap
    if (node.lobe === 'left' && node.x > width / 2 - gap / 2) node.x = width / 2 - gap / 2;
    if (node.lobe === 'right' && node.x < width / 2 + gap / 2) node.x = width / 2 + gap / 2;
  }
  for (let iter = 0; iter < ITER; iter++) {
    // Repulsion
    for (let i = 0; i < points.length; i++) {
      let dx = 0, dy = 0;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        if (points[i].lobe !== points[j].lobe) continue; // only intra-lobe repulsion
        let vx = points[i].x - points[j].x;
        let vy = points[i].y - points[j].y;
        let dist = Math.sqrt(vx * vx + vy * vy) + 0.01;
        let rep = (k * k) / dist;
        dx += (vx / dist) * rep;
        dy += (vy / dist) * rep;
      }
      points[i].x += dx * 0.002;
      points[i].y += dy * 0.002;
    }
    // Attraction (edges)
    for (let i = 0; i < points.length; i++) {
      const node = points[i];
      for (const nid of node.neighbors) {
        const other = points.find(n => n.id === nid);
        if (!other) continue;
        let vx = other.x - node.x;
        let vy = other.y - node.y;
        let dist = Math.sqrt(vx * vx + vy * vy) + 0.01;
        // Attraction is stronger for higher intensity
        let attr = ((dist * dist) / k) * (1 + 0.5 * (node.intensity === 10 ? 2 : node.intensity / 10));
        node.x += (vx / dist) * attr * 0.0015;
        node.y += (vy / dist) * attr * 0.0015;
      }
      keepInEllipse(node);
    }
  }
  // Return as NodePosition[]
  return points.map(({ lobe, intensity, ...rest }) => rest);
}

// --- Top Down Brain 2 (Polygon Boundary) ---
const TOP_DOWN_BRAIN2_POLY = [
  { x: 0.4722222222222222, y: 0.1349206349206349 },
  { x: 0.4722222222222222, y: 0.15079365079365079 },
  { x: 0.4722222222222222, y: 0.16666666666666666 },
  { x: 0.4722222222222222, y: 0.18253968253968253 },
  { x: 0.4722222222222222, y: 0.1984126984126984 },
  { x: 0.48333333333333334, y: 0.1984126984126984 },
  { x: 0.48333333333333334, y: 0.21428571428571427 },
  { x: 0.48333333333333334, y: 0.23015873015873015 },
  { x: 0.48333333333333334, y: 0.24603174603174602 },
  { x: 0.48333333333333334, y: 0.2619047619047619 },
  { x: 0.48333333333333334, y: 0.2777777777777778 },
  { x: 0.48333333333333334, y: 0.29365079365079366 },
  { x: 0.48333333333333334, y: 0.30952380952380953 },
  { x: 0.48333333333333334, y: 0.3253968253968254 },
  { x: 0.48333333333333334, y: 0.3412698412698413 },
  { x: 0.48333333333333334, y: 0.35714285714285715 },
  { x: 0.48333333333333334, y: 0.373015873015873 },
  { x: 0.48333333333333334, y: 0.3888888888888889 },
  { x: 0.48333333333333334, y: 0.40476190476190477 },
  { x: 0.48333333333333334, y: 0.42063492063492064 },
  { x: 0.48333333333333334, y: 0.4365079365079365 },
  { x: 0.48333333333333334, y: 0.4523809523809524 },
  { x: 0.48333333333333334, y: 0.46825396825396826 },
  { x: 0.4722222222222222, y: 0.48412698412698413 },
  { x: 0.4722222222222222, y: 0.5 },
  { x: 0.4722222222222222, y: 0.5158730158730159 },
  { x: 0.4722222222222222, y: 0.5317460317460317 },
  { x: 0.4722222222222222, y: 0.5476190476190477 },
  { x: 0.4722222222222222, y: 0.5634920634920635 },
  { x: 0.4722222222222222, y: 0.5793650793650794 },
  { x: 0.4722222222222222, y: 0.5952380952380952 },
  { x: 0.4722222222222222, y: 0.6111111111111112 },
  { x: 0.4722222222222222, y: 0.626984126984127 },
  { x: 0.4722222222222222, y: 0.6428571428571429 },
  { x: 0.4722222222222222, y: 0.6587301587301587 },
  { x: 0.4722222222222222, y: 0.6746031746031746 },
  { x: 0.4722222222222222, y: 0.6904761904761905 },
  { x: 0.4722222222222222, y: 0.7063492063492064 },
  { x: 0.4722222222222222, y: 0.7222222222222222 },
  { x: 0.4722222222222222, y: 0.7380952380952381 },
  { x: 0.4722222222222222, y: 0.753968253968254 },
  { x: 0.4722222222222222, y: 0.7698412698412699 },
  { x: 0.4722222222222222, y: 0.7857142857142857 },
  { x: 0.4722222222222222, y: 0.8015873015873016 },
  { x: 0.4722222222222222, y: 0.8174603174603174 },
  { x: 0.4722222222222222, y: 0.8333333333333334 },
  { x: 0.46111111111111114, y: 0.8333333333333334 },
  { x: 0.46111111111111114, y: 0.8492063492063492 },
  { x: 0.45, y: 0.8492063492063492 },
  { x: 0.45, y: 0.8650793650793651 },
  { x: 0.4388888888888889, y: 0.8650793650793651 },
  { x: 0.42777777777777776, y: 0.8809523809523809 },
  { x: 0.4166666666666667, y: 0.8809523809523809 },
  { x: 0.40555555555555556, y: 0.8968253968253969 },
  { x: 0.39444444444444443, y: 0.8968253968253969 },
  { x: 0.38333333333333336, y: 0.8968253968253969 },
  { x: 0.37222222222222223, y: 0.8968253968253969 },
  { x: 0.3611111111111111, y: 0.8968253968253969 },
  { x: 0.35, y: 0.8968253968253969 },
  { x: 0.3388888888888889, y: 0.8968253968253969 },
  { x: 0.31666666666666665, y: 0.8809523809523809 },
  { x: 0.3055555555555556, y: 0.8809523809523809 },
  { x: 0.29444444444444445, y: 0.8809523809523809 },
  { x: 0.2833333333333333, y: 0.8650793650793651 },
  { x: 0.2722222222222222, y: 0.8650793650793651 },
  { x: 0.2611111111111111, y: 0.8650793650793651 },
  { x: 0.25, y: 0.8492063492063492 },
  { x: 0.25, y: 0.8333333333333334 },
  { x: 0.2388888888888889, y: 0.8333333333333334 },
  { x: 0.22777777777777777, y: 0.8333333333333334 },
  { x: 0.22777777777777777, y: 0.8174603174603174 },
  { x: 0.21666666666666667, y: 0.8015873015873016 },
  { x: 0.20555555555555555, y: 0.7857142857142857 },
  { x: 0.19444444444444445, y: 0.7857142857142857 },
  { x: 0.18333333333333332, y: 0.7698412698412699 },
  { x: 0.17222222222222222, y: 0.753968253968254 },
  { x: 0.17222222222222222, y: 0.7380952380952381 },
  { x: 0.16111111111111112, y: 0.7222222222222222 },
  { x: 0.15, y: 0.7063492063492064 },
  { x: 0.1388888888888889, y: 0.6904761904761905 },
  { x: 0.12777777777777777, y: 0.6746031746031746 },
  { x: 0.11666666666666667, y: 0.6587301587301587 },
  { x: 0.11666666666666667, y: 0.6428571428571429 },
  { x: 0.10555555555555556, y: 0.626984126984127 },
  { x: 0.09444444444444444, y: 0.6111111111111112 },
  { x: 0.09444444444444444, y: 0.5952380952380952 },
  { x: 0.08333333333333333, y: 0.5793650793650794 },
  { x: 0.08333333333333333, y: 0.5634920634920635 },
  { x: 0.07222222222222222, y: 0.5476190476190477 },
  { x: 0.07222222222222222, y: 0.5317460317460317 },
  { x: 0.07222222222222222, y: 0.5158730158730159 },
  { x: 0.07222222222222222, y: 0.5 },
  { x: 0.07222222222222222, y: 0.48412698412698413 },
  { x: 0.07222222222222222, y: 0.46825396825396826 },
  { x: 0.08333333333333333, y: 0.4523809523809524 },
  { x: 0.08333333333333333, y: 0.4365079365079365 },
  { x: 0.09444444444444444, y: 0.42063492063492064 },
  { x: 0.09444444444444444, y: 0.40476190476190477 },
  { x: 0.10555555555555556, y: 0.3888888888888889 },
  { x: 0.11666666666666667, y: 0.373015873015873 },
  { x: 0.1388888888888889, y: 0.3412698412698413 },
  { x: 0.15, y: 0.3253968253968254 },
  { x: 0.16111111111111112, y: 0.30952380952380953 },
  { x: 0.17222222222222222, y: 0.29365079365079366 },
  { x: 0.18333333333333332, y: 0.2777777777777778 },
  { x: 0.19444444444444445, y: 0.2619047619047619 },
  { x: 0.20555555555555555, y: 0.2619047619047619 },
  { x: 0.21666666666666667, y: 0.24603174603174602 },
  { x: 0.22777777777777777, y: 0.24603174603174602 },
  { x: 0.2388888888888889, y: 0.23015873015873015 },
  { x: 0.25, y: 0.21428571428571427 },
  { x: 0.2611111111111111, y: 0.1984126984126984 },
  { x: 0.2722222222222222, y: 0.1984126984126984 },
  { x: 0.2833333333333333, y: 0.18253968253968253 },
  { x: 0.29444444444444445, y: 0.16666666666666666 },
  { x: 0.3055555555555556, y: 0.16666666666666666 },
  { x: 0.31666666666666665, y: 0.15079365079365079 },
  { x: 0.3277777777777778, y: 0.1349206349206349 },
  { x: 0.35, y: 0.1349206349206349 },
  { x: 0.3611111111111111, y: 0.11904761904761904 },
  { x: 0.37222222222222223, y: 0.11904761904761904 },
  { x: 0.37222222222222223, y: 0.10317460317460317 },
  { x: 0.38333333333333336, y: 0.10317460317460317 },
  { x: 0.39444444444444443, y: 0.10317460317460317 },
  { x: 0.40555555555555556, y: 0.10317460317460317 },
  { x: 0.4166666666666667, y: 0.10317460317460317 },
  { x: 0.4388888888888889, y: 0.11904761904761904 },
  { x: 0.48333333333333334, y: 0.1349206349206349 },
  { x: 0.5277777777777778, y: 0.15079365079365079 },
  { x: 0.5277777777777778, y: 0.16666666666666666 },
  { x: 0.5277777777777778, y: 0.18253968253968253 },
  { x: 0.5277777777777778, y: 0.1984126984126984 },
  { x: 0.5277777777777778, y: 0.21428571428571427 },
  { x: 0.5277777777777778, y: 0.23015873015873015 },
  { x: 0.5388888888888889, y: 0.24603174603174602 },
  { x: 0.5388888888888889, y: 0.2619047619047619 },
  { x: 0.5388888888888889, y: 0.2777777777777778 },
  { x: 0.5388888888888889, y: 0.29365079365079366 },
  { x: 0.5388888888888889, y: 0.30952380952380953 },
  { x: 0.5388888888888889, y: 0.3253968253968254 },
  { x: 0.5388888888888889, y: 0.3412698412698413 },
  { x: 0.5388888888888889, y: 0.35714285714285715 },
  { x: 0.5388888888888889, y: 0.373015873015873 },
  { x: 0.5388888888888889, y: 0.3888888888888889 },
  { x: 0.5388888888888889, y: 0.40476190476190477 },
  { x: 0.5388888888888889, y: 0.42063492063492064 },
  { x: 0.5388888888888889, y: 0.4365079365079365 },
  { x: 0.5388888888888889, y: 0.4523809523809524 },
  { x: 0.5277777777777778, y: 0.46825396825396826 },
  { x: 0.5277777777777778, y: 0.48412698412698413 },
  { x: 0.5277777777777778, y: 0.5 },
  { x: 0.5277777777777778, y: 0.5158730158730159 },
  { x: 0.5277777777777778, y: 0.5317460317460317 },
  { x: 0.5277777777777778, y: 0.5476190476190477 },
  { x: 0.5277777777777778, y: 0.5634920634920635 },
  { x: 0.5277777777777778, y: 0.5793650793650794 },
  { x: 0.5277777777777778, y: 0.5952380952380952 },
  { x: 0.5277777777777778, y: 0.6111111111111112 },
  { x: 0.5277777777777778, y: 0.626984126984127 },
  { x: 0.5277777777777778, y: 0.6428571428571429 },
  { x: 0.5277777777777778, y: 0.6587301587301587 },
  { x: 0.5277777777777778, y: 0.6746031746031746 },
  { x: 0.5277777777777778, y: 0.6904761904761905 },
  { x: 0.5277777777777778, y: 0.7063492063492064 },
  { x: 0.5277777777777778, y: 0.7222222222222222 },
  { x: 0.5277777777777778, y: 0.7380952380952381 },
  { x: 0.5277777777777778, y: 0.753968253968254 },
  { x: 0.5277777777777778, y: 0.7698412698412699 },
  { x: 0.5277777777777778, y: 0.7857142857142857 },
  { x: 0.5277777777777778, y: 0.8015873015873016 },
  { x: 0.5277777777777778, y: 0.8174603174603174 },
  { x: 0.5388888888888889, y: 0.8333333333333334 },
  { x: 0.5388888888888889, y: 0.8492063492063492 },
  { x: 0.55, y: 0.8492063492063492 },
  { x: 0.5611111111111111, y: 0.8650793650793651 },
  { x: 0.5722222222222222, y: 0.8650793650793651 },
  { x: 0.5833333333333334, y: 0.8650793650793651 },
  { x: 0.5833333333333334, y: 0.8809523809523809 },
  { x: 0.5944444444444444, y: 0.8809523809523809 },
  { x: 0.6055555555555555, y: 0.8809523809523809 },
  { x: 0.6166666666666667, y: 0.8809523809523809 },
  { x: 0.6277777777777778, y: 0.8809523809523809 },
  { x: 0.6388888888888888, y: 0.8809523809523809 },
  { x: 0.65, y: 0.8650793650793651 },
  { x: 0.6611111111111111, y: 0.8650793650793651 },
  { x: 0.6722222222222223, y: 0.8650793650793651 },
  { x: 0.6833333333333333, y: 0.8650793650793651 },
  { x: 0.6944444444444444, y: 0.8650793650793651 },
  { x: 0.6944444444444444, y: 0.8492063492063492 },
  { x: 0.7055555555555556, y: 0.8492063492063492 },
  { x: 0.7166666666666667, y: 0.8333333333333334 },
  { x: 0.7277777777777777, y: 0.8333333333333334 },
  { x: 0.7388888888888889, y: 0.8174603174603174 },
  { x: 0.75, y: 0.8174603174603174 },
  { x: 0.75, y: 0.8015873015873016 },
  { x: 0.7611111111111111, y: 0.8015873015873016 },
  { x: 0.7611111111111111, y: 0.7857142857142857 },
  { x: 0.7722222222222223, y: 0.7857142857142857 },
  { x: 0.7833333333333333, y: 0.7857142857142857 },
  { x: 0.7833333333333333, y: 0.7698412698412699 },
  { x: 0.7944444444444444, y: 0.7698412698412699 },
  { x: 0.7944444444444444, y: 0.753968253968254 },
  { x: 0.8055555555555556, y: 0.753968253968254 },
  { x: 0.8055555555555556, y: 0.7380952380952381 },
  { x: 0.8166666666666667, y: 0.7380952380952381 },
  { x: 0.8166666666666667, y: 0.7222222222222222 },
  { x: 0.8277777777777777, y: 0.7222222222222222 },
  { x: 0.8277777777777777, y: 0.7063492063492064 },
  { x: 0.8388888888888889, y: 0.6904761904761905 },
  { x: 0.8388888888888889, y: 0.6746031746031746 },
  { x: 0.85, y: 0.6746031746031746 },
  { x: 0.85, y: 0.6587301587301587 },
  { x: 0.85, y: 0.6428571428571429 },
  { x: 0.85, y: 0.626984126984127 },
  { x: 0.8611111111111112, y: 0.626984126984127 },
  { x: 0.8611111111111112, y: 0.6111111111111112 },
  { x: 0.8611111111111112, y: 0.5952380952380952 },
  { x: 0.8722222222222222, y: 0.5952380952380952 },
  { x: 0.8722222222222222, y: 0.5793650793650794 },
  { x: 0.8722222222222222, y: 0.5634920634920635 },
  { x: 0.8833333333333333, y: 0.5476190476190477 },
  { x: 0.8833333333333333, y: 0.5317460317460317 },
  { x: 0.8833333333333333, y: 0.5158730158730159 },
  { x: 0.8944444444444445, y: 0.5 },
  { x: 0.8944444444444445, y: 0.48412698412698413 },
  { x: 0.8944444444444445, y: 0.46825396825396826 },
  { x: 0.8944444444444445, y: 0.4523809523809524 },
  { x: 0.8944444444444445, y: 0.4365079365079365 },
  { x: 0.8944444444444445, y: 0.42063492063492064 },
  { x: 0.8833333333333333, y: 0.42063492063492064 },
  { x: 0.8833333333333333, y: 0.40476190476190477 },
  { x: 0.8833333333333333, y: 0.3888888888888889 },
  { x: 0.8833333333333333, y: 0.373015873015873 },
  { x: 0.8722222222222222, y: 0.373015873015873 },
  { x: 0.8722222222222222, y: 0.35714285714285715 },
  { x: 0.8722222222222222, y: 0.3412698412698413 },
  { x: 0.8611111111111112, y: 0.3412698412698413 },
  { x: 0.8611111111111112, y: 0.3253968253968254 },
  { x: 0.85, y: 0.30952380952380953 },
  { x: 0.8388888888888889, y: 0.30952380952380953 },
  { x: 0.8388888888888889, y: 0.29365079365079366 },
  { x: 0.8388888888888889, y: 0.2777777777777778 },
  { x: 0.8277777777777777, y: 0.2777777777777778 },
  { x: 0.8166666666666667, y: 0.2619047619047619 },
  { x: 0.8055555555555556, y: 0.24603174603174602 },
  { x: 0.7944444444444444, y: 0.23015873015873015 },
  { x: 0.7833333333333333, y: 0.21428571428571427 },
  { x: 0.7722222222222223, y: 0.1984126984126984 },
  { x: 0.7611111111111111, y: 0.18253968253968253 },
  { x: 0.75, y: 0.18253968253968253 },
  { x: 0.7388888888888889, y: 0.16666666666666666 },
  { x: 0.7277777777777777, y: 0.15079365079365079 },
  { x: 0.7166666666666667, y: 0.15079365079365079 },
  { x: 0.7055555555555556, y: 0.1349206349206349 },
  { x: 0.6944444444444444, y: 0.1349206349206349 },
  { x: 0.6833333333333333, y: 0.1349206349206349 },
  { x: 0.6833333333333333, y: 0.11904761904761904 },
  { x: 0.6722222222222223, y: 0.11904761904761904 },
  { x: 0.6611111111111111, y: 0.11904761904761904 },
  { x: 0.65, y: 0.11904761904761904 },
  { x: 0.6388888888888888, y: 0.11904761904761904 },
  { x: 0.6277777777777778, y: 0.10317460317460317 },
  { x: 0.6166666666666667, y: 0.10317460317460317 },
  { x: 0.6055555555555555, y: 0.10317460317460317 },
  { x: 0.5944444444444444, y: 0.10317460317460317 },
  { x: 0.5833333333333334, y: 0.10317460317460317 },
  { x: 0.5722222222222222, y: 0.10317460317460317 },
  { x: 0.5722222222222222, y: 0.11904761904761904 },
  { x: 0.5611111111111111, y: 0.11904761904761904 },
  { x: 0.55, y: 0.11904761904761904 },
  { x: 0.55, y: 0.1349206349206349 },
  { x: 0.42777777777777776, y: 0.10317460317460317 },
  { x: 0.45, y: 0.1349206349206349 },
  { x: 0.45, y: 0.11904761904761904 },
  { x: 0.46111111111111114, y: 0.11904761904761904 }
];

function isInTopDownBrain2Poly(x: number, y: number, poly: {x: number, y: number}[]) {
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

export function generateTopDownBrain2Layout(nodes: SkillNode[], params: ShapeParams): NodePosition[] {
  const { width, height } = params;
  const n = nodes.length;
  const poly = TOP_DOWN_BRAIN2_POLY.map(p => ({ x: p.x * width, y: p.y * height }));
  const nodePositions: NodePosition[] = [];
  let count = 0;
  let tries = 0;
  const maxTries = 20000;
  while (count < n && tries < maxTries) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    if (isInTopDownBrain2Poly(rx, ry, poly)) {
      nodePositions.push({
        id: nodes[count].id,
        x: rx,
        y: ry,
        brightness: 0.7,
        neighbors: [],
        score: nodes[count].score,
        color: '#3bb0e0',
        size: 8
      });
      count++;
    }
    tries++;
  }
  return nodePositions;
} 