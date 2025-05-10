import React, { useMemo, useState } from 'react';
import dummyNodes from '../data/dummyNodes.json';
import { getShapeLayout } from '../layout/shapeLayout';
import { scoreToRadius } from '../shapes/moebius';

const WIDTH = 600;
const HEIGHT = 420;
const SHAPES = [
  { value: 'infinity', label: 'Infinity' },
  { value: 'infinity2', label: 'Infinity 2' },
  { value: 'moebius', label: 'Moebius' },
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function ShapeCanvas() {
  const [shape, setShape] = useState<'infinity' | 'infinity2' | 'moebius'>('infinity');
  const [nodeCount, setNodeCount] = useState(48);
  const [nodeSpace, setNodeSpace] = useState(1.0);

  // Dynamically generate nodes based on nodeCount
  const baseNodes = useMemo(() => {
    // Use the first N dummy nodes, or repeat if not enough
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
      const { width, height } = { width: WIDTH, height: HEIGHT };
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
      // Use grid-like infinity2 layout
      return getShapeLayout('infinity2', baseNodes, { width: WIDTH, height: HEIGHT, nodeSpace });
    } else {
      // Use the default moebius layout
      return getShapeLayout('moebius', baseNodes, { width: WIDTH, height: HEIGHT, nodeSpace }).map((n) => ({ ...n, score: baseNodes.find(d => d.id === n.id)?.score || 1 }));
    }
  }, [shape, layeredNodes, baseNodes, nodeSpace]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative' }}>
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
          onChange={e => setShape(e.target.value as 'infinity' | 'infinity2' | 'moebius')}
          style={{ fontSize: 16, padding: '4px 8px', borderRadius: 4 }}
        >
          {SHAPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: 12 }}>BJJ Skill Tree</h1>
      <svg width={WIDTH} height={HEIGHT} style={{ background: 'none', display: 'block' }}>
        {/* Subtle shading ellipse for 3D feel */}
        <ellipse
          cx={WIDTH / 2}
          cy={HEIGHT / 2}
          rx={WIDTH * 0.38}
          ry={HEIGHT * 0.28}
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
        {shape === 'infinity2'
          ? (() => {
              // Draw grid connections only once per pair
              const lines = [];
              const seen = new Set();
              for (const node of nodePositions) {
                if (!node.neighbors) continue;
                for (const neighborId of node.neighbors) {
                  const key = [node.id, neighborId].sort().join('-');
                  if (seen.has(key)) continue;
                  seen.add(key);
                  const neighbor = nodePositions.find(n => n.id === neighborId);
                  if (!neighbor) continue;
                  lines.push(
                    <line
                      key={key}
                      x1={node.x}
                      y1={node.y}
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