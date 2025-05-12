import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import masterNodes from '../data/MasterNodes.json';

interface MasterNode {
  id: string;
  name: string;
  category: string;
  x: number | null;
  y: number | null;
  brightness: number;
  size: number;
  connections: string[];
  placed: boolean;
}

const CATEGORIES = [
  'Fundamentals',
  'Physical',
  'Mental',
  'Techniques',
  'Practice',
  'Internal',
];

export default function ManualGrid() {
  const [nodes, setNodes] = useState<MasterNode[]>(masterNodes);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<MasterNode | null>(null);
  const [newNode, setNewNode] = useState({ name: '', category: CATEGORIES[0] });
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Save nodes to localStorage for persistence
  useEffect(() => {
    localStorage.setItem('bjj_nodes', JSON.stringify(nodes));
  }, [nodes]);

  // On mount, load from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem('bjj_nodes');
    if (saved) {
      setNodes(JSON.parse(saved));
    }
  }, []);

  // Filtered nodes with search
  const filteredPlaced = nodes.filter(n =>
    n.placed &&
    (filter === 'all' || n.category === filter) &&
    (search === '' || n.name.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredUnplaced = nodes.filter(n =>
    !n.placed &&
    (filter === 'all' || n.category === filter) &&
    (search === '' || n.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Group unplaced nodes by category
  const groupedUnplaced = CATEGORIES.map(cat => ({
    category: cat,
    nodes: nodes.filter(n => !n.placed && n.category === cat && (search === '' || n.name.toLowerCase().includes(search.toLowerCase())))
  })).filter(group => group.nodes.length > 0);

  // Add node
  function addNode() {
    if (!newNode.name.trim()) return;
    const id = `${newNode.category.toLowerCase().slice(0,4)}-${Math.random().toString(36).slice(2,7)}`;
    const updatedNodes = [
      ...nodes,
      {
        id,
        name: newNode.name,
        category: newNode.category,
        x: null,
        y: null,
        brightness: 0.7,
        size: 8,
        connections: [],
        placed: false,
      },
    ];
    setNodes(updatedNodes);
    setNewNode({ name: '', category: CATEGORIES[0] });
  }

  // Remove node
  function removeNode(id: string) {
    const updatedNodes = nodes.filter(n => n.id !== id);
    setNodes(updatedNodes);
  }

  // Edit node
  function saveEdit() {
    if (!editing) return;
    const updatedNodes = nodes.map(n => n.id === editing.id ? editing : n);
    setNodes(updatedNodes);
    setEditing(null);
  }

  // Mark placed/unplaced
  function togglePlaced(id: string) {
    const updatedNodes = nodes.map(n => n.id === id ? { ...n, placed: !n.placed } : n);
    setNodes(updatedNodes);
  }

  // Handle background image upload
  function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Handle grid click to place node
  function handleGridClick(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    if (!selectedNodeId) return;
    const rect = (e.target as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasSize.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasSize.height;
    const updatedNodes = nodes.map(n =>
      n.id === selectedNodeId
        ? { ...n, x, y, placed: true }
        : n
    );
    setNodes(updatedNodes);
  }

  // Placed nodes for current category
  const placedNodes = nodes.filter(n => n.placed && n.x !== null && n.y !== null && (filter === 'all' || n.category === filter));

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left: Node list */}
      <div style={{ width: 340, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <button onClick={() => navigate('/')} style={{ marginBottom: 16, padding: '6px 16px', fontSize: 15, borderRadius: 7, background: '#3bb0e0', color: '#fff', border: 'none', fontWeight: 600 }}>Back</button>
        <h2>Nodes</h2>
        <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '60%', marginRight: 8 }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <h3>Placed Nodes</h3>
        {/* Placed nodes list */}
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
          {filteredPlaced.length === 0 && <li style={{ color: '#888', fontStyle: 'italic' }}>None</li>}
          {filteredPlaced.map(node => (
            <li
              key={node.id}
              style={{
                marginBottom: 6,
                background: selectedNodeId === node.id ? '#e6f0fa' : '#fff',
                borderRadius: 6,
                padding: 8,
                border: selectedNodeId === node.id ? '2px solid #3bb0e0' : '1px solid #ddd',
                cursor: 'pointer',
                color: '#222',
                fontWeight: selectedNodeId === node.id ? 600 : 400,
              }}
              onClick={() => setSelectedNodeId(node.id)}
            >
              {node.name}
              {node.x !== null && node.y !== null && (
                <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                  ({Math.round(node.x)}, {Math.round(node.y)})
                </span>
              )}
            </li>
          ))}
        </ul>
        {/* Placed node action bar */}
        {selectedNodeId && filteredPlaced.some(n => n.id === selectedNodeId) && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(nodes.find(n => n.id === selectedNodeId)!)}>Edit</button>
            <button onClick={() => removeNode(selectedNodeId)} style={{ color: 'red' }}>Remove</button>
            <button onClick={() => togglePlaced(selectedNodeId)}>Unplace</button>
          </div>
        )}
        <h3>Unplaced Nodes</h3>
        {/* Grouped unplaced nodes by category */}
        <div>
          {groupedUnplaced.length === 0 && <div style={{ color: '#888', fontStyle: 'italic' }}>None</div>}
          {groupedUnplaced.map(group => (
            <div key={group.category} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, color: '#3bb0e0', marginBottom: 2 }}>{group.category}</div>
              <ul style={{ listStyle: 'none', paddingLeft: 16 }}>
                {group.nodes.map(node => (
                  <li
                    key={node.id}
                    style={{
                      marginBottom: 4,
                      background: selectedNodeId === node.id ? '#e6f0fa' : '#fff',
                      borderRadius: 6,
                      padding: 6,
                      border: selectedNodeId === node.id ? '2px solid #3bb0e0' : '1px solid #ddd',
                      cursor: 'pointer',
                      color: '#222',
                      fontWeight: selectedNodeId === node.id ? 600 : 400,
                    }}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {node.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Unplaced node action bar */}
        {selectedNodeId && nodes.some(n => n.id === selectedNodeId && !n.placed) && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(nodes.find(n => n.id === selectedNodeId)!)}>Edit</button>
            <button onClick={() => removeNode(selectedNodeId)} style={{ color: 'red' }}>Remove</button>
            <button onClick={() => togglePlaced(selectedNodeId)}>Place</button>
          </div>
        )}
        <h3>Add Node</h3>
        <input
          type="text"
          placeholder="Skill name"
          value={newNode.name}
          onChange={e => setNewNode({ ...newNode, name: e.target.value })}
          style={{ width: '60%', marginRight: 8 }}
        />
        <select value={newNode.category} onChange={e => setNewNode({ ...newNode, category: e.target.value })}>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button onClick={addNode} style={{ marginLeft: 8 }}>Add</button>
        <div style={{ marginTop: 16 }}>
          <label style={{ fontWeight: 600, marginRight: 8 }}>Background:</label>
          <input type="file" accept="image/*" onChange={handleBgUpload} />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>
            <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Show Grid
          </label>
        </div>
      </div>
      {/* Center: Interactive grid/canvas */}
      <div style={{ flex: 1, padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div ref={canvasRef} style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height, border: '2px solid #444', background: '#111' }}>
          <svg
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
            onClick={handleGridClick}
          >
            {/* Grid overlay */}
            {showGrid && Array.from({ length: 20 }).map((_, i) => (
              <g key={i}>
                <line x1={i * canvasSize.width / 20} y1={0} x2={i * canvasSize.width / 20} y2={canvasSize.height} stroke="#444" strokeWidth={1} />
                <line y1={i * canvasSize.height / 20} x1={0} y2={i * canvasSize.height / 20} x2={canvasSize.width} stroke="#444" strokeWidth={1} />
              </g>
            ))}
            {/* Placed nodes */}
            {placedNodes.map(node => (
              <circle
                key={node.id}
                cx={node.x!}
                cy={node.y!}
                r={node.size}
                fill={selectedNodeId === node.id ? '#3bb0e0' : '#ffb347'}
                stroke="#222"
                strokeWidth={2}
              />
            ))}
          </svg>
          {/* Background image */}
          {bgImage && (
            <img
              src={bgImage}
              alt="bg"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSize.width,
                height: canvasSize.height,
                opacity: 0.25,
                zIndex: 0,
                pointerEvents: 'none',
                objectFit: 'cover',
              }}
            />
          )}
        </div>
      </div>
      {/* Right: Node property editor */}
      <div style={{ width: 300, borderLeft: '1px solid #ccc', padding: 16 }}>
        <h2>Node Editor</h2>
        {editing ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <label>Name: </label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Category: </label>
              <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Brightness: </label>
              <input type="number" min={0.1} max={1.0} step={0.01} value={editing.brightness} onChange={e => setEditing({ ...editing, brightness: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Size: </label>
              <input type="number" min={1} max={32} value={editing.size} onChange={e => setEditing({ ...editing, size: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Placed: </label>
              <input type="checkbox" checked={editing.placed} onChange={e => setEditing({ ...editing, placed: e.target.checked })} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Connections (comma-separated IDs): </label>
              <input value={editing.connections.join(',')} onChange={e => setEditing({ ...editing, connections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
            </div>
            <button onClick={saveEdit} style={{ marginRight: 8 }}>Save</button>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
        ) : selectedNodeId ? (
          <div style={{ color: '#888' }}>Select "Edit" above to edit this node.</div>
        ) : (
          <div style={{ color: '#888' }}>Select a node to edit.</div>
        )}
      </div>
    </div>
  );
} 