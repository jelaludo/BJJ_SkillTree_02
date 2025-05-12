import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dummyNodes from '../data/dummyNodes.json';
import { getShapeLayout } from '../layout/shapeLayout';
import { scoreToRadius } from '../shapes/moebius';
import { getBrain3RegionParams, getBrain3OutlinePoints, getBrain4PolygonOutlinePoints } from '../shapes/brain';

// Add NodePosition interface
interface NodePosition {
  id: string;
  x: number;
  y: number;
  brightness?: number;
  score?: number;
  size?: number;
  neighbors?: string[];
}

const BASE_WIDTH = 600;
const BASE_HEIGHT = 420;
const SHAPES = [
  { value: 'infinity', label: 'Infinity' },
  { value: 'infinity2', label: 'Infinity 2' },
  { value: 'infinity3', label: 'Infinity 3' },
  { value: 'moebius', label: 'Moebius' },
  { value: 'brain', label: 'Brain' },
  { value: 'brain2', label: 'Brain 2' },
  { value: 'brain3', label: 'Brain 3' },
  { value: 'brain4svg', label: 'Brain 4 SVG' },
  { value: 'brainsvg2', label: 'Brain SVG 2' },
  { value: 'fist1', label: 'Fist 1' },
  { value: 'fist', label: 'Fist' },
  { value: 'brainTest', label: 'Brain Test' },
  { value: 'brainTest2', label: 'Brain Test 2' },
  { value: 'muscleTest', label: 'Muscle Test' },
  { value: 'muscleTest90x63', label: '90x63 Muscle' },
  { value: 'muscleTest90x63Fill', label: '90x63 Muscle (Fill Interior)' },
  { value: 'topDownBrain', label: 'Top Down Brain' },
  { value: 'topDownBrain2', label: 'Top Down Brain 2' },
  { value: 'chikara', label: 'Chikara (力)' },
];

const CONNECTION_TYPES = [
  { value: 'chain', label: 'A) Chain' },
  { value: 'linearBus', label: 'B) Linear Bus' },
  { value: 'tree', label: 'C) Tree' },
  { value: 'ring', label: 'D) Ring' },
  { value: 'hubSpoke', label: 'E) Hub-and-spoke' },
  { value: 'fullyConnected', label: 'F) Fully Connected' },
  { value: 'partialMesh', label: 'G) Partial Mesh' },
  { value: 'incomplete', label: 'H) Multiple Incomplete Networks' },
  { value: 'none', label: 'I) No Connections' },
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Utility: get safe drawing area for contained shapes
function getSafeArea(width: number, height: number) {
  const marginTop = 80;
  const marginSide = 40;
  const marginBottom = 40;
  return {
    x: marginSide,
    y: marginTop,
    width: width - 2 * marginSide,
    height: height - marginTop - marginBottom,
  };
}

// Connection logic for all 9 types
function applyConnections(nodes: NodePosition[], type: string): NodePosition[] {
  const n = nodes.length;
  if (n === 0) return nodes;
  let newNodes = nodes.map(node => ({ ...node, neighbors: [] as string[] }));
  switch (type) {
    case 'chain':
      for (let i = 0; i < n; i++) {
        if (i > 0) newNodes[i].neighbors!.push(newNodes[i - 1].id);
        if (i < n - 1) newNodes[i].neighbors!.push(newNodes[i + 1].id);
      }
      break;
    case 'linearBus':
      for (let i = 0; i < n; i++) {
        if (i > 0) newNodes[i].neighbors!.push(newNodes[i - 1].id);
        if (i < n - 1) newNodes[i].neighbors!.push(newNodes[i + 1].id);
        // Add a branch every 3rd node
        if (i % 3 === 0 && i + 3 < n) newNodes[i].neighbors!.push(newNodes[i + 3].id);
      }
      break;
    case 'tree': {
      // Simple binary tree
      for (let i = 0; i < n; i++) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < n) newNodes[i].neighbors!.push(newNodes[left].id);
        if (right < n) newNodes[i].neighbors!.push(newNodes[right].id);
        if (i > 0) newNodes[i].neighbors!.push(newNodes[Math.floor((i - 1) / 2)].id);
      }
      break;
    }
    case 'ring':
      for (let i = 0; i < n; i++) {
        newNodes[i].neighbors!.push(newNodes[(i + 1) % n].id);
        newNodes[i].neighbors!.push(newNodes[(i - 1 + n) % n].id);
      }
      break;
    case 'hubSpoke':
      // First node is hub
      for (let i = 1; i < n; i++) {
        newNodes[0].neighbors!.push(newNodes[i].id);
        newNodes[i].neighbors!.push(newNodes[0].id);
      }
      break;
    case 'fullyConnected':
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) newNodes[i].neighbors!.push(newNodes[j].id);
        }
      }
      break;
    case 'partialMesh':
      for (let i = 0; i < n; i++) {
        const neighbors = new Set<string>();
        while (neighbors.size < Math.min(3, n - 1)) {
          const j = Math.floor(Math.random() * n);
          if (j !== i) neighbors.add(newNodes[j].id);
        }
        newNodes[i].neighbors = Array.from(neighbors);
      }
      break;
    case 'incomplete': {
      // Some lonely nodes, rest in small incomplete clusters
      const lonelyCount = Math.max(1, Math.floor(n * 0.15)); // 15% lonely
      const shuffled = [...newNodes].sort(() => Math.random() - 0.5);
      const lonelyNodes = shuffled.slice(0, lonelyCount);
      const clustered = shuffled.slice(lonelyCount);
      // Mark lonely nodes (no neighbors)
      lonelyNodes.forEach(node => { node.neighbors = []; });
      // Split clustered nodes into 2-4 clusters
      const clusterCount = Math.min(4, Math.max(2, Math.floor(clustered.length / 3)));
      const clusters: NodePosition[][] = Array.from({ length: clusterCount }, () => []);
      clustered.forEach((node, i) => {
        clusters[i % clusterCount].push(node);
      });
      // For each cluster, connect each node to 1-2 random others in the same cluster
      clusters.forEach(cluster => {
        for (let i = 0; i < cluster.length; i++) {
          const node = cluster[i];
          const others = cluster.filter((n, idx) => idx !== i);
          const numLinks = Math.min(2, others.length);
          const links = others.sort(() => Math.random() - 0.5).slice(0, numLinks);
          node.neighbors = Array.from(new Set([...(node.neighbors || []), ...links.map(n => n.id)]));
        }
      });
      break;
    }
    case 'none':
      // No connections
      break;
    default:
      break;
  }
  return newNodes;
}

// Helper: stable hash for node id
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function ShapeCanvas() {
  const [shape, setShape] = useState<'infinity' | 'infinity2' | 'infinity3' | 'moebius' | 'brain' | 'brain2' | 'brain3' | 'brain4svg' | 'brainsvg2' | 'fist1' | 'fist' | 'brainTest' | 'brainTest2' | 'muscleTest' | 'muscleTest90x63' | 'muscleTest90x63Fill' | 'topDownBrain' | 'topDownBrain2' | 'chikara'>('infinity');
  const [nodeCount, setNodeCount] = useState(60);
  const [nodeSizeVar, setNodeSizeVar] = useState(5); // 1-10
  const [nodeBrightVar, setNodeBrightVar] = useState(5); // 1-10
  const [nodeSpace, setNodeSpace] = useState(1.0);
  const [showOutline, setShowOutline] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });
  const navigate = useNavigate();
  const [maxInsideConnections, setMaxInsideConnections] = useState(1); // New state for inside node connections
  const [connectionType, setConnectionType] = useState('chain');
  const [randomSeed, setRandomSeed] = useState(() => Math.floor(Math.random() * 1e9).toString());
  const [nodeClusters, setNodeClusters] = useState(1); // 1 = even, 10 = tight clusters

  // Responsive container size
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Dynamically generate nodes based on nodeCount
  const baseNodes = useMemo(() => {
    const arr = [];
    for (let i = 0; i < nodeCount; i++) {
      const src = dummyNodes[i % dummyNodes.length];
      arr.push({ ...src, id: `${src.id}-dyn${i}` });
    }
    return arr;
  }, [nodeCount]);

  // For multi-layered infinity, generate 3x nodes with random variations
  const layeredNodes = useMemo(() => {
    if (shape !== 'infinity') return baseNodes;
    const layers = 3;
    const all: any[] = [];
    for (let l = 0; l < layers; l++) {
      baseNodes.forEach((node, i) => {
        all.push({
          ...node,
          id: `${node.id}-layer${l}`,
          score: getRandomInt(1, 10),
          _layer: l,
          _offset: (l - 1) * nodeSpace, // -space, 0, +space for 3 layers
        });
      });
    }
    return all;
  }, [shape, baseNodes, nodeSpace]);

  // Helper: seeded random number generator
  function seededRandom(seed: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function() {
      h += h << 13; h ^= h >>> 7;
      h += h << 3; h ^= h >>> 17;
      h += h << 5;
      return (h >>> 0) / 4294967296;
    };
  }

  // Clustering logic: move nodes toward cluster centers
  function applyClustering(positions: NodePosition[], clusters: number, seed: string, strength: number) {
    if (clusters <= 1) return positions;
    const rand = seededRandom(seed + 'clusters');
    // Pick cluster centers
    const centers = Array.from({ length: clusters }, () => {
      const idx = Math.floor(rand() * positions.length);
      return { x: positions[idx].x, y: positions[idx].y };
    });
    // Assign each node to a cluster
    return positions.map((node, i) => {
      const clusterIdx = Math.floor(rand() * clusters);
      const center = centers[clusterIdx];
      // Interpolate: strength=0 (no move), strength=1 (at center)
      const t = strength;
      return {
        ...node,
        x: node.x * (1 - t) + center.x * t,
        y: node.y * (1 - t) + center.y * t,
      };
    });
  }

  const nodePositions = useMemo(() => {
    let positions: NodePosition[];
    if (shape === 'infinity') {
      const { width, height } = containerSize;
      const cx = width / 2;
      const cy = height / 2;
      const A = Math.min(width, height) * 0.42;
      const B = Math.min(width, height) * 0.19;
      const n = baseNodes.length;
      positions = layeredNodes.map((node: any, idx: number) => {
        const i = idx % n;
        const t = (i / n) * 2 * Math.PI;
        const offset = node._offset || 0;
        const x = cx + (A + offset * 90) * Math.cos(t);
        const y = cy + (B + offset * 60) * Math.sin(2 * t) / 1.2;
        const brightness = nodeBrightVar === 1 ? 0.7 : 0.3 + 0.7 * (getRandomInt(1, nodeBrightVar) - 1) / 9;
        const size = nodeSizeVar === 1 ? 12 : 6 + 12 * (getRandomInt(1, nodeSizeVar) - 1) / 9;
        return {
          id: node.id,
          x,
          y,
          brightness,
          score: node.score,
          size,
        };
      });
    } else if (shape === 'infinity2') {
      positions = getShapeLayout('infinity2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'infinity3') {
      positions = getShapeLayout('infinity3', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain') {
      positions = getShapeLayout('brain', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain2') {
      positions = getShapeLayout('brain2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain3') {
      positions = getShapeLayout('brain3', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain4svg') {
      positions = getShapeLayout('brain4svg', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brainsvg2') {
      positions = getShapeLayout('brainsvg2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'fist1') {
      positions = getShapeLayout('fist1', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'fist') {
      positions = getShapeLayout('fist', baseNodes, { ...containerSize, nodeSpace, maxInsideConnections });
    } else if (shape === 'brainTest') {
      positions = getShapeLayout('brainTest', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brainTest2') {
      positions = getShapeLayout('brainTest2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'muscleTest') {
      positions = getShapeLayout('muscleTest', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'muscleTest90x63') {
      positions = getShapeLayout('muscleTest90x63', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'muscleTest90x63Fill') {
      positions = getShapeLayout('muscleTest90x63Fill', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'topDownBrain') {
      positions = getShapeLayout('topDownBrain', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'topDownBrain2') {
      positions = getShapeLayout('topDownBrain2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'chikara') {
      positions = getShapeLayout('chikara', baseNodes, { ...containerSize, nodeSpace });
    } else {
      positions = getShapeLayout('moebius', baseNodes, { ...containerSize, nodeSpace }).map((n) => ({ ...n, score: baseNodes.find(d => d.id === n.id)?.score || 1 }));
    }
    let clustered = positions;
    if (nodeClusters > 1) {
      // Map slider 1-10 to clusters 1-6, and strength 0-0.85
      const nClusters = 12 - nodeClusters; // 11 at 1, 2 at 10
      const strength = (nodeClusters - 1) / 12 * 0.85; // max 0.85
      clustered = applyClustering(positions, nClusters, randomSeed, strength);
    }
    return applyConnections(clustered, connectionType);
  }, [shape, layeredNodes, baseNodes, containerSize, maxInsideConnections, connectionType, randomSeed, nodeClusters]);

  // Outline paths for the brain3 shape (semicircle + triangle, always in sync with node region)
  const brain3Outlines = useMemo(() => {
    if (shape !== 'brain3') return null;
    const { width, height } = containerSize;
    const region = getBrain3RegionParams(width, height);
    const outlines = getBrain3OutlinePoints(region, 120);
    return outlines;
  }, [shape, containerSize]);

  // Outline paths for the brain4svg shape (polygon)
  const brain4svgOutline = useMemo(() => {
    if (shape !== 'brain4svg') return null;
    const { width, height } = containerSize;
    return getBrain4PolygonOutlinePoints(width, height);
  }, [shape, containerSize]);

  // Calculate bounding box for all nodes to set viewBox
  const bounds = useMemo(() => {
    if (shape === 'brain3' && brain3Outlines && brain3Outlines.semicircle) {
      // Use the outline for brain3
      const { x, y, width, height } = getSafeArea(containerSize.width, containerSize.height);
      return { minX: x, minY: y, maxX: x + width, maxY: y + height };
    }
    if (nodePositions.length === 0) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodePositions) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    }
    // Add padding
    const pad = 50;
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }, [shape, nodePositions, brain3Outlines]);

  // Outline paths for the brain shape
  const brainOutlines = useMemo(() => {
    if (shape !== 'brain') return null;
    const { width, height } = containerSize;
    // Left lobe (quarter circle arc)
    const leftLobe = [];
    const cxL = width * 0.48;
    const cyL = height * 0.38;
    const rL = width * 0.25;
    for (let a = Math.PI; a >= Math.PI * 0.5; a -= Math.PI / 60) {
      leftLobe.push([
        cxL + rL * Math.cos(a),
        cyL + rL * Math.sin(a),
      ]);
    }
    // Right lobe (quarter circle arc, 20% larger)
    const rightLobe = [];
    const cxR = width * 0.52;
    const cyR = height * 0.38;
    const rR = width * 0.25 * 1.2;
    for (let a = 0; a <= Math.PI * 0.5; a += Math.PI / 60) {
      rightLobe.push([
        cxR + rR * Math.cos(a),
        cyR + rR * Math.sin(a),
      ]);
    }
    // Band (rectangle)
    const bandTop = height * 0.41;
    const bandBot = height * 0.58;
    const bandLeft = width * 0.28;
    const bandRight = width * 0.72;
    const band = [
      [bandLeft, bandTop],
      [bandRight, bandTop],
      [bandRight, bandBot],
      [bandLeft, bandBot],
      [bandLeft, bandTop],
    ];
    // Stem (triangle)
    const stemTop = { x: width * 0.52, y: height * 0.58 };
    const stemRight = { x: width * 0.60, y: height * 0.58 };
    const stemBottom = { x: width * 0.56, y: height * 0.88 };
    const stem = [
      [stemTop.x, stemTop.y],
      [stemRight.x, stemRight.y],
      [stemBottom.x, stemBottom.y],
      [stemTop.x, stemTop.y],
    ];
    // Oblong (ellipse)
    const oblong = [];
    const cxO = width * 0.5;
    const cyO = height * 0.48;
    const rxO = width * 0.13;
    const ryO = height * 0.09;
    for (let t = 0; t <= 2 * Math.PI; t += Math.PI / 60) {
      oblong.push([
        cxO + rxO * Math.cos(t),
        cyO + ryO * Math.sin(t),
      ]);
    }
    return { leftLobe, rightLobe, band, stem, oblong };
  }, [shape, containerSize]);

  // Outline paths for the brain2 shape
  const brain2Outlines = useMemo(() => {
    if (shape !== 'brain2') return null;
    const { width, height } = containerSize;
    // Define safe drawing area
    const marginTop = 80;
    const marginSide = 40;
    const marginBottom = 40;
    const drawX = marginSide;
    const drawY = marginTop;
    const drawWidth = width - 2 * marginSide;
    const drawHeight = height - marginTop - marginBottom;
    // Top half-oblong (ellipse, flat on bottom)
    const oblong = [];
    const cx = drawX + drawWidth / 2;
    const cy = drawY + drawHeight * 0.32; // slightly down from top of draw area
    const rx = drawWidth * 0.48; // nearly full width
    const ry = drawHeight * 0.28; // less than half height
    // Only top half: t in [0, PI]
    for (let t = 0; t <= Math.PI; t += Math.PI / 60) {
      oblong.push([
        cx + rx * Math.cos(t),
        cy + ry * Math.sin(t),
      ]);
    }
    // Add flat bottom (from right to left)
    oblong.push([cx - rx, cy]);
    oblong.push([cx + rx, cy]);
    oblong.push([cx + rx, cy]); // close path
    // Stem triangle (bottom right)
    const stem = [];
    const top = { x: cx + rx * 0.38, y: cy + ry * 0.95 };
    const right = { x: drawX + drawWidth * 0.82, y: drawY + drawHeight * 0.98 };
    const left = { x: cx + rx * 0.02, y: drawY + drawHeight * 0.98 };
    stem.push([top.x, top.y]);
    stem.push([right.x, right.y]);
    stem.push([left.x, left.y]);
    stem.push([top.x, top.y]); // close path
    return { oblong, stem };
  }, [shape, containerSize]);

  // Determine line and node color based on shape
  const isBrainShape = shape === 'brain' || shape === 'brain2' || shape === 'brain3';
  const isBrain4SVG = shape === 'brain4svg';
  const isMuscleRed = shape === 'muscleTest90x63';
  const lineColor = isBrainShape || isBrain4SVG ? '#3bb0e0' : isMuscleRed ? '#c0392b' : '#ffb347';
  const nodeFill = (brightness: number) =>
    isBrainShape || isBrain4SVG
      ? `rgba(59, 176, 224, ${brightness || 0.7})`
      : isMuscleRed
        ? `rgba(192, 57, 43, ${brightness || 0.7})`
        : `rgba(255, 153, 51, ${brightness || 0.7})`;
  const nodeStroke = isBrainShape || isBrain4SVG ? '#3bb0e0' : isMuscleRed ? '#922B21' : '#ffb347';
  const nodeFilter = isBrainShape || isBrain4SVG
    ? 'drop-shadow(0 2px 8px #3bb0e055)'
    : isMuscleRed
      ? 'drop-shadow(0 2px 8px #c0392b55)'
      : 'drop-shadow(0 2px 8px #ffb34755)';

  const renderEdges = useCallback((ctx: CanvasRenderingContext2D, positions: NodePosition[]) => {
    if (!showEdges) return; // Skip edge rendering if edges are hidden
    
    ctx.strokeStyle = 'rgba(59, 176, 224, 0.3)';
    ctx.lineWidth = 1;
    
    positions.forEach(node => {
      if (!node.neighbors) return;
      node.neighbors.forEach((neighborId: string) => {
        const neighbor = positions.find(n => n.id === neighborId);
        if (neighbor) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(neighbor.x, neighbor.y);
          ctx.stroke();
        }
      });
    });
  }, [showEdges]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Draw Shape Navigation Button */}
      <button
        onClick={() => navigate('/draw-shape')}
        style={{ position: 'absolute', top: 24, left: 32, zIndex: 20, padding: '8px 18px', fontSize: 16, borderRadius: 8, background: '#3bb0e0', color: '#fff', border: 'none', fontWeight: 600, boxShadow: '0 2px 8px #0002' }}
      >
        Draw Shape
      </button>
      <button
        onClick={() => navigate('/manual-grid')}
        style={{ position: 'absolute', top: 24, left: 170, zIndex: 20, padding: '8px 18px', fontSize: 16, borderRadius: 8, background: '#3bb0e0', color: '#fff', border: 'none', fontWeight: 600, boxShadow: '0 2px 8px #0002' }}
      >
        Manual Grid
      </button>
      {/* Controls top right */}
      <div style={{ position: 'absolute', top: 24, right: 32, background: 'rgba(24,30,34,0.92)', padding: 16, borderRadius: 10, boxShadow: '0 2px 12px #0002', zIndex: 10, minWidth: 260 }}>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="node-count" style={{ fontWeight: 600, marginRight: 8 }}>Node Count:</label>
          <input
            id="node-count"
            type="range"
            min={40}
            max={200}
            value={nodeCount}
            onChange={e => setNodeCount(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeCount}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="node-size-var" style={{ fontWeight: 600, marginRight: 8 }}>Node Sizes:</label>
          <input
            id="node-size-var"
            type="range"
            min={1}
            max={10}
            value={nodeSizeVar}
            onChange={e => setNodeSizeVar(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeSizeVar}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="node-bright-var" style={{ fontWeight: 600, marginRight: 8 }}>Node Brightness:</label>
          <input
            id="node-bright-var"
            type="range"
            min={1}
            max={10}
            value={nodeBrightVar}
            onChange={e => setNodeBrightVar(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeBrightVar}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="node-clusters" style={{ fontWeight: 600, marginRight: 8 }}>Node Clusters:</label>
          <input
            id="node-clusters"
            type="range"
            min={1}
            max={10}
            value={nodeClusters}
            onChange={e => setNodeClusters(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeClusters}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="max-inside-connections" style={{ fontWeight: 600, marginRight: 8 }}>Max Inside Connections:</label>
          <input
            id="max-inside-connections"
            type="range"
            min={0}
            max={5}
            value={maxInsideConnections}
            onChange={e => setMaxInsideConnections(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{maxInsideConnections}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="show-outline" style={{ fontWeight: 600, marginRight: 8 }}>Shape Outline:</label>
          <input
            id="show-outline"
            type="checkbox"
            checked={showOutline}
            onChange={e => setShowOutline(e.target.checked)}
            style={{ verticalAlign: 'middle' }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="show-edges" style={{ fontWeight: 600, marginRight: 8 }}>Edge Visibility:</label>
          <input
            id="show-edges"
            type="checkbox"
            checked={showEdges}
            onChange={e => setShowEdges(e.target.checked)}
            style={{ verticalAlign: 'middle' }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="connection-type" style={{ fontWeight: 600, marginRight: 8 }}>Connection Type:</label>
          <select
            id="connection-type"
            value={connectionType}
            onChange={e => setConnectionType(e.target.value)}
            style={{ fontSize: 15, padding: '4px 8px', borderRadius: 4 }}
          >
            {CONNECTION_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setRandomSeed(Math.floor(Math.random() * 1e9).toString())}
            style={{ fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: '#3bb0e0', color: '#fff', border: 'none', marginRight: 8 }}
          >
            Randomize Layout
          </button>
          <span style={{ fontSize: 12, color: '#888' }}>Seed: {randomSeed}</span>
        </div>
      </div>
      {/* Shape selector */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="shape-select" style={{ fontWeight: 600, marginRight: 8 }}>Shape:</label>
        <select
          id="shape-select"
          value={shape}
          onChange={e => setShape(e.target.value as any)}
          style={{ fontSize: 16, padding: '4px 8px', borderRadius: 4 }}
        >
          {SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 12 }}>BJJ Skill Tree</h1>
      <svg
        width="100%"
        height="100%"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`}
        style={{ background: 'none', display: 'block', maxWidth: '100vw', maxHeight: '100vh' }}
      >
        {/* Subtle shading ellipse for 3D feel */}
        <ellipse
          cx={(bounds.minX + bounds.maxX) / 2}
          cy={(bounds.minY + bounds.maxY) / 2}
          rx={(bounds.maxX - bounds.minX) * 0.38}
          ry={(bounds.maxY - bounds.minY) * 0.28}
          fill="url(#moebiusShade)"
          opacity="0.22"
        />
        <defs>
          <radialGradient id="moebiusShade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {/* Shape outlines for brain */}
        {showOutline && shape === 'brain' && brainOutlines && (
          <g>
            <polyline
              points={brainOutlines.leftLobe.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brainOutlines.rightLobe.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brainOutlines.band.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brainOutlines.stem.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brainOutlines.oblong.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
          </g>
        )}
        {/* Shape outlines for brain2 */}
        {showOutline && shape === 'brain2' && brain2Outlines && (
          <g>
            <polyline
              points={brain2Outlines.oblong.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brain2Outlines.stem.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
          </g>
        )}
        {/* Shape outlines for brain3 */}
        {showOutline && shape === 'brain3' && brain3Outlines && (
          <g>
            <polyline
              points={brain3Outlines.semicircle.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
            <polyline
              points={brain3Outlines.triangle.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
          </g>
        )}
        {/* Shape outlines for brain4svg */}
        {showOutline && shape === 'brain4svg' && brain4svgOutline && (
          <polyline
            points={brain4svgOutline.map(p => p.join(",")).join(" ")}
            fill="none"
            stroke="#bbb"
            strokeDasharray="3,5"
            strokeWidth={2}
            opacity={0.7}
          />
        )}
        {/* Connect nodes with lines to form the loop or grid */}
        {showEdges && (
          shape === 'fist'
            ? (() => {
                // Detect hubs for the Fist shape
                const insideNodes = nodePositions.filter(n => n.size === 5);
                const hubNodes = nodePositions.filter(n => n.size === 5).slice(0, 4); // 4 hubs, as in layout
                const hubIds = new Set(hubNodes.map(n => n.id));
                const lines = [];
                const seen = new Set();
                for (const node of nodePositions) {
                  if (!node.neighbors) continue;
                  for (const neighborId of node.neighbors) {
                    const key = [node.id, neighborId].sort().join('-');
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const neighbor = nodePositions.find(nn => nn.id === neighborId);
                    if (!neighbor || !neighbor.neighbors) continue;
                    // Determine connection type
                    const isOutline = node.size === 8 && neighbor.size === 8;
                    const isHubLine = (hubIds.has(node.id) && !hubIds.has(neighborId)) || (!hubIds.has(node.id) && hubIds.has(neighborId));
                    const isBothNonHub = !hubIds.has(node.id) && !hubIds.has(neighborId);
                    let opacity = 0.8; // default: outline
                    if (isHubLine) {
                      opacity = 0.6; // inside strong
                    } else if (isBothNonHub) {
                      opacity = 0.2; // inside weak
                    }
                    lines.push(
                      <line
                        key={key}
                        x1={node.x}
                        y1={node.y}
                        x2={neighbor.x}
                        y2={neighbor.y}
                        stroke={lineColor}
                        strokeWidth={isOutline ? 2 : 1.2}
                        opacity={opacity}
                      />
                    );
                  }
                }
                return lines;
              })()
            : shape === 'infinity2' || shape === 'infinity3'
            ? (() => {
                const lines = [];
                const seen = new Set();
                for (const node of nodePositions) {
                  const n = node as any;
                  if (!n.neighbors) continue;
                  for (const neighborId of n.neighbors) {
                    const key = [n.id, neighborId].sort().join('-');
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const neighbor = nodePositions.find(nn => nn.id === neighborId);
                    if (!neighbor) continue;
                    lines.push(
                      <line
                        key={key}
                        x1={n.x}
                        y1={n.y}
                        x2={neighbor.x}
                        y2={neighbor.y}
                        stroke={lineColor}
                        strokeWidth={1.2}
                        opacity={0.45}
                      />
                    );
                  }
                }
                return lines;
              })()
            : nodePositions.map((node, i) => {
                const next = nodePositions[(i + 1) % nodePositions.length];
                return (
                  <line
                    key={node.id + '-line'}
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={lineColor}
                    strokeWidth={2}
                    opacity={0.25}
                  />
                );
              })
        )}
        {/* Render nodes */}
        {nodePositions.map((node) => {
          // Node Brightness logic: 1 = all dark, 10 = 80% bright
          const brightPercent = 0.8 * (nodeBrightVar - 1) / 9; // 0 at 1, 0.8 at 10
          const isBright = (hashString(node.id) % 100) < brightPercent * 100;
          const brightness = isBright ? 0.95 : 0.3;
          // Node Size logic: at nodeSizeVar=1, all same; at 10, bright nodes are 2x size
          const baseSize = 8;
          const sizeScale = nodeSizeVar === 1 ? 1 : 1 + (isBright ? (nodeSizeVar - 1) / 9 : 0);
          const size = baseSize * sizeScale;
          return (
            <circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={size}
              fill={nodeFill(brightness)}
              stroke={nodeStroke}
              strokeWidth={brightness * 2.2}
              style={{ filter: nodeFilter }}
            />
          );
        })}
      </svg>
    </div>
  );
} 