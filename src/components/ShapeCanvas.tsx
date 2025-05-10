import React, { useMemo, useState, useRef, useEffect } from 'react';
import dummyNodes from '../data/dummyNodes.json';
import { getShapeLayout } from '../layout/shapeLayout';
import { scoreToRadius } from '../shapes/moebius';

const BASE_WIDTH = 600;
const BASE_HEIGHT = 420;
const SHAPES = [
  { value: 'infinity', label: 'Infinity' },
  { value: 'infinity2', label: 'Infinity 2' },
  { value: 'infinity3', label: 'Infinity 3' },
  { value: 'moebius', label: 'Moebius' },
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function ShapeCanvas() {
  const [shape, setShape] = useState<'infinity' | 'infinity2' | 'infinity3' | 'moebius'>('infinity');
  const [nodeCount, setNodeCount] = useState(48);
  const [nodeSpace, setNodeSpace] = useState(1.0);
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
        const brightness = 0.3 + 0.7 * (node.score - 1) / 9;
        return {
          id: node.id,
          x,
          y,
          brightness,
          score: node.score,
        };
      });
    } else if (shape === 'infinity2') {
      return getShapeLayout('infinity2', baseNodes, { ...containerSize, nodeSpace });
    } else if (shape === 'infinity3') {
      return getShapeLayout('infinity3', baseNodes, { ...containerSize, nodeSpace });
    } else {
      return getShapeLayout('moebius', baseNodes, { ...containerSize, nodeSpace }).map((n) => ({ ...n, score: baseNodes.find(d => d.id === n.id)?.score || 1 }));
    }
  }, [shape, layeredNodes, baseNodes, nodeSpace, containerSize]);

  // Calculate bounding box for all nodes to set viewBox
  const bounds = useMemo(() => {
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
  }, [nodePositions]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Controls top right */}
      <div style={{ position: 'absolute', top: 24, right: 32, background: 'rgba(24,30,34,0.92)', padding: 16, borderRadius: 10, boxShadow: '0 2px 12px #0002', zIndex: 10 }}>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="node-count" style={{ fontWeight: 600, marginRight: 8 }}>Node Count:</label>
          <input
            id="node-count"
            type="range"
            min={20}
            max={80}
            value={nodeCount}
            onChange={e => setNodeCount(Number(e.target.value))}
            style={{ verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeCount}</span>
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
            style={{ verticalAlign: 'middle' }}
          />
          <span style={{ marginLeft: 8, fontWeight: 500 }}>{nodeSpace.toFixed(2)}</span>
        </div>
      </div>
      {/* Shape selector */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="shape-select" style={{ fontWeight: 600, marginRight: 8 }}>Shape:</label>
        <select
          id="shape-select"
          value={shape}
          onChange={e => setShape(e.target.value as 'infinity' | 'infinity2' | 'infinity3' | 'moebius')}
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
                      stroke="#ffb347"
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
                  stroke="#ffb347"
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
            r={scoreToRadius(node.score || 5) * (0.8 + Math.random() * 0.4)}
            fill={`rgba(255, 153, 51, ${node.brightness || 0.7})`}
            stroke="#ffb347"
            strokeWidth={(node.brightness || 0.7) * 2.2}
            style={{ filter: 'drop-shadow(0 2px 8px #ffb34755)' }}
          />
        ))}
      </svg>
    </div>
  );
} 