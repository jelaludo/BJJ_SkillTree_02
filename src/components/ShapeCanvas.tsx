import React, { useMemo, useState, useRef, useEffect } from 'react';
import dummyNodes from '../data/dummyNodes.json';
import { getShapeLayout } from '../layout/shapeLayout';
import { scoreToRadius } from '../shapes/moebius';
import { getBrain3RegionParams, getBrain3OutlinePoints } from '../shapes/brain';

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

export default function ShapeCanvas() {
  const [shape, setShape] = useState<'infinity' | 'infinity2' | 'infinity3' | 'moebius' | 'brain' | 'brain2' | 'brain3'>('infinity');
  const [nodeCount, setNodeCount] = useState(60);
  const [nodeSizeVar, setNodeSizeVar] = useState(5); // 1-10
  const [nodeBrightVar, setNodeBrightVar] = useState(5); // 1-10
  const [nodeSpace, setNodeSpace] = useState(1.0);
  const [showOutline, setShowOutline] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: BASE_WIDTH, height: BASE_HEIGHT });

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

  // Custom layout for multi-layered infinity
  const nodePositions = useMemo(() => {
    if (shape === 'infinity') {
      const { width, height } = containerSize;
      const cx = width / 2;
      const cy = height / 2;
      const A = Math.min(width, height) * 0.42;
      const B = Math.min(width, height) * 0.19;
      const n = baseNodes.length;
      return layeredNodes.map((node: any, idx: number) => {
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
      return getShapeLayout('infinity2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'infinity3') {
      return getShapeLayout('infinity3', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain') {
      return getShapeLayout('brain', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain2') {
      return getShapeLayout('brain2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'brain3') {
      return getShapeLayout('brain3', baseNodes, { ...containerSize, nodeSpace });
    } else {
      return getShapeLayout('moebius', baseNodes, { ...containerSize, nodeSpace }).map((n) => ({ ...n, score: baseNodes.find(d => d.id === n.id)?.score || 1 }));
    }
  }, [shape, layeredNodes, baseNodes, nodeSpace, containerSize, nodeSizeVar, nodeBrightVar]);

  // Outline paths for the brain3 shape (circle, always in sync with node region)
  const brain3Outlines = useMemo(() => {
    if (shape !== 'brain3') return null;
    const { width, height } = containerSize;
    const region = getBrain3RegionParams(width, height);
    const outline = getBrain3OutlinePoints(region, 120);
    return { outline };
  }, [shape, containerSize]);

  // Calculate bounding box for all nodes to set viewBox
  const bounds = useMemo(() => {
    if (shape === 'brain3' && brain3Outlines && brain3Outlines.outline) {
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
  const lineColor = isBrainShape ? '#3bb0e0' : '#ffb347';
  const nodeFill = (brightness: number) => isBrainShape ? `rgba(59, 176, 224, ${brightness || 0.7})` : `rgba(255, 153, 51, ${brightness || 0.7})`;
  const nodeStroke = isBrainShape ? '#3bb0e0' : '#ffb347';
  const nodeFilter = isBrainShape ? 'drop-shadow(0 2px 8px #3bb0e055)' : 'drop-shadow(0 2px 8px #ffb34755)';

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        <div>
          <label htmlFor="node-space" style={{ fontWeight: 600, marginRight: 8 }}>Node Space:</label>
          <input
            id="node-space"
            type="range"
            min={0.5}
            max={2.0}
            step={0.01}
            value={nodeSpace}
            onChange={e => setNodeSpace(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeSpace.toFixed(2)}</span>
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
              points={brain3Outlines.outline.map(p => p.join(",")).join(" ")}
              fill="none"
              stroke="#bbb"
              strokeDasharray="3,5"
              strokeWidth={2}
              opacity={0.7}
            />
          </g>
        )}
        {/* Connect nodes with lines to form the loop or grid */}
        {shape === 'infinity2' || shape === 'infinity3'
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
            })}
        {/* Render nodes */}
        {nodePositions.map((node) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={'size' in node ? node.size : scoreToRadius(node.score || 5) * (nodeSizeVar === 1 ? 1 : 0.8 + Math.random() * 0.4)}
            fill={nodeFill(node.brightness || 0.7)}
            stroke={nodeStroke}
            strokeWidth={(node.brightness || 0.7) * 2.2}
            style={{ filter: nodeFilter }}
          />
        ))}
      </svg>
    </div>
  );
} 