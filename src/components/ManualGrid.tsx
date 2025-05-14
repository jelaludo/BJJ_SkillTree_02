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

// Helper: get all shape names from localStorage
function getAllShapeNames() {
  return Object.keys(localStorage)
    .filter(k => k.startsWith('bjj_shape_'))
    .map(k => k.replace('bjj_shape_', ''));
}

export default function ManualGrid() {
  const [shapeName, setShapeName] = useState<string>(() => {
    const all = getAllShapeNames();
    return all.length > 0 ? all[0] : 'Default';
  });
  const [newShapeName, setNewShapeName] = useState('');
  const [newShapeCategory, setNewShapeCategory] = useState(CATEGORIES[0]);
  const [nodes, setNodes] = useState<MasterNode[]>([]);
  const [shapeCategory, setShapeCategory] = useState<string>(CATEGORIES[0]);
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
  const [connectionSearch, setConnectionSearch] = useState('');
  const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showBackground, setShowBackground] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(CATEGORIES[0]);

  // Calculate square grid cell size and number of columns/rows
  const TARGET_CELLS = 20;
  const cellSize = Math.min(canvasSize.width, canvasSize.height) / TARGET_CELLS;
  const numCols = Math.floor(canvasSize.width / cellSize);
  const numRows = Math.floor(canvasSize.height / cellSize);

  // On mount or shape change, load nodes for this shape
  useEffect(() => {
    const key = 'bjj_shape_' + shapeName;
    const catKey = 'bjj_shape_category_' + shapeName;
    const saved = localStorage.getItem(key);
    const savedCategory = localStorage.getItem(catKey);
    let category = savedCategory || CATEGORIES[0];
    setShapeCategory(category);
    if (saved) {
      const loadedNodes = JSON.parse(saved);
      // Filter nodes to only the shape's category
      const filteredNodes = loadedNodes.filter((n: MasterNode) => n.category === category);
      setNodes(filteredNodes);
    } else {
      // Start with a fresh copy of masterNodes, filtered to the shape's category
      setNodes(masterNodes.filter(n => n.category === category).map(n => ({ ...n })));
    }
    setSelectedNodeId(null);
  }, [shapeName]);

  // Autosave nodes to localStorage for this shape
  useEffect(() => {
    if (!shapeName) return;
    localStorage.setItem('bjj_shape_' + shapeName, JSON.stringify(nodes));
  }, [nodes, shapeName]);

  // Shape management
  const allShapeNames = getAllShapeNames();
  function handleNewShape() {
    if (!newShapeName.trim()) return;
    // Use the selected category for the new shape
    const newNodes = masterNodes
      .filter(n => n.category === newShapeCategory)
      .map(n => ({ ...n }));
    setShapeName(newShapeName.trim());
    setNodes(newNodes);
    setNewShapeName('');
    setNewShapeCategory(CATEGORIES[0]);
    // Store the category for this shape
    localStorage.setItem('bjj_shape_category_' + newShapeName.trim(), newShapeCategory);
    setShapeCategory(newShapeCategory);
  }

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
    // Ensure new node matches the category of existing nodes
    const category = nodes.length > 0 ? nodes[0].category : newNode.category;
    const id = `${category.toLowerCase().slice(0,4)}-${Math.random().toString(36).slice(2,7)}`;
    const updatedNodes = [
      ...nodes,
      {
        id,
        name: newNode.name,
        category,
        x: null,
        y: null,
        brightness: 0.7,
        size: 8,
        connections: [],
        placed: false,
      },
    ];
    setNodes(updatedNodes);
    setNewNode({ name: '', category });
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

  // Helper: get node by id
  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  // Helper: get nearby nodes (for placed nodes, within 200px)
  function getNearbyNodes(node: MasterNode) {
    if (node.x == null || node.y == null) return [];
    return nodes.filter(n => n.id !== node.id && n.x != null && n.y != null &&
      Math.hypot(n.x! - node.x!, n.y! - node.y!) < 200);
  }

  // Helper: get all nodes for search/autocomplete
  function getConnectionOptions(node: MasterNode) {
    // Placed nodes first, then unplaced
    return nodes
      .filter(n => n.id !== node.id)
      .sort((a, b) => (b.placed ? 1 : 0) - (a.placed ? 1 : 0) || a.name.localeCompare(b.name));
  }

  // Helper: get filtered connection options for search (show all placed nodes by default)
  function getFilteredConnectionOptions(node: MasterNode, search: string) {
    let options = nodes.filter(n => n.id !== node.id && !node.connections.includes(n.id) && n.placed);
    if (search.trim()) {
      options = options.filter(n => n.name.toLowerCase().includes(search.toLowerCase()));
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Helper: get current category for the shape (from state)
  const currentCategory = shapeCategory;
  const placedInCategory = nodes.filter(n => n.placed);
  const unplacedInCategory = nodes.filter(n => !n.placed);
  const totalInCategory = nodes.length;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left: Node list */}
      <div style={{ width: 340, borderRight: '1px solid #ccc', padding: 16, overflowY: 'auto' }}>
        <button onClick={() => navigate('/')} style={{ marginBottom: 16, padding: '6px 16px', fontSize: 15, borderRadius: 7, background: '#3bb0e0', color: '#fff', border: 'none', fontWeight: 600 }}>Back</button>
        {/* Shape selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, marginRight: 8 }}>Shape:</label>
          <select value={shapeName} onChange={e => setShapeName(e.target.value)} style={{ marginRight: 8 }}>
            {allShapeNames.length === 0 && <option value="Default">Default</option>}
            {allShapeNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <input
            type="text"
            placeholder="New shape name"
            value={newShapeName}
            onChange={e => setNewShapeName(e.target.value)}
            style={{ width: 110, marginRight: 4 }}
          />
          <select value={newShapeCategory} onChange={e => setNewShapeCategory(e.target.value)} style={{ marginRight: 4 }}>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button onClick={handleNewShape} style={{ padding: '2px 10px' }}>New</button>
          {/* New controls below */}
          <div style={{ marginTop: 12, marginBottom: 8 }}>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontWeight: 600, marginRight: 8 }}>Background:</label>
              <input type="file" accept="image/*" onChange={handleBgUpload} />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label>
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Show Grid
              </label>
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ fontWeight: 600, marginRight: 8 }}>Show Background:</label>
              <input type="checkbox" checked={showBackground} onChange={e => setShowBackground(e.target.checked)} />
            </div>
            <div style={{ marginBottom: 2, color: '#3bb0e0', fontWeight: 600 }}>
              Grid Size (px): {canvasSize.width} × {canvasSize.height}
            </div>
            <div style={{ color: '#3bb0e0', fontWeight: 600 }}>
              Grid Cells: {numCols} × {numRows} (Squares)
            </div>
          </div>
        </div>
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
        {/* Grouped unplaced nodes by category (collapsible) */}
        <div>
          {groupedUnplaced.length === 0 && <div style={{ color: '#888', fontStyle: 'italic' }}>None</div>}
          {groupedUnplaced.map(group => (
            <div key={group.category} style={{ marginBottom: 8 }}>
              <div
                style={{ fontWeight: 600, color: '#3bb0e0', marginBottom: 2, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }}
                onClick={() => setExpandedCategory(expandedCategory === group.category ? null : group.category)}
              >
                <span style={{ marginRight: 6 }}>{expandedCategory === group.category ? '▼' : '▶'}</span>
                {group.category}
                <span style={{ color: '#888', fontWeight: 400, marginLeft: 8, fontSize: 13 }}>({group.nodes.length})</span>
              </div>
              {expandedCategory === group.category && (
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
              )}
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
            {showGrid && (
              <g>
                {/* Vertical lines */}
                {Array.from({ length: numCols + 1 }).map((_, i) => (
                  <line
                    key={'v' + i}
                    x1={i * cellSize}
                    y1={0}
                    x2={i * cellSize}
                    y2={canvasSize.height}
                    stroke="#444"
                    strokeWidth={1}
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: numRows + 1 }).map((_, i) => (
                  <line
                    key={'h' + i}
                    y1={i * cellSize}
                    x1={0}
                    y2={i * cellSize}
                    x2={canvasSize.width}
                    stroke="#444"
                    strokeWidth={1}
                  />
                ))}
              </g>
            )}
            {/* Draw connection lines between placed nodes */}
            {nodes.filter(n => n.placed && n.x !== null && n.y !== null).map(node => (
              node.connections
                .map(connId => nodes.find(n2 => n2.id === connId && n2.placed && n2.x !== null && n2.y !== null))
                .filter((connNode): connNode is MasterNode => !!connNode)
                .map(connNode => (
                  <line
                    key={node.id + '-' + connNode.id}
                    x1={node.x!}
                    y1={node.y!}
                    x2={connNode.x!}
                    y2={connNode.y!}
                    stroke="#3bb0e0"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                ))
            ))}
            {/* Placed nodes */}
            {placedNodes.map(node => (
              <g key={node.id}>
                <circle
                  cx={node.x!}
                  cy={node.y!}
                  r={node.size}
                  fill={selectedNodeId === node.id ? '#3bb0e0' : '#ffb347'}
                  stroke="#222"
                  strokeWidth={2}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                />
                {hoveredNodeId === node.id && (
                  <text
                    x={node.x! + 12}
                    y={node.y! - 12}
                    fill="#fff"
                    fontSize={15}
                    fontWeight={700}
                    stroke="#222"
                    strokeWidth={0.5}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {node.name}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {/* Background image */}
          {bgImage && showBackground && (
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
        {/* Category and statistics for current category */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
            Category: <span style={{ color: '#3bb0e0' }}>{currentCategory}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
            <div>
              <span style={{ color: '#3bb0e0', fontWeight: 600, marginRight: 8 }}>{placedInCategory.length}</span>
              Placed Nodes
            </div>
            <div>
              <span style={{ color: '#ffb347', fontWeight: 600, marginRight: 8 }}>{unplacedInCategory.length}</span>
              Unplaced Nodes
            </div>
            <div>
              <span style={{ color: '#fff', fontWeight: 600, marginRight: 8 }}>{totalInCategory}</span>
              Total Nodes
            </div>
          </div>
        </div>
        <h2>Node Editor</h2>
        {selectedNode ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <label>Name: </label>
              <input value={selectedNode.name} onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, name: e.target.value } : n))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Category: </label>
              <select value={selectedNode.category} onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, category: e.target.value } : n))}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Brightness: </label>
              <input type="number" min={0.1} max={1.0} step={0.01} value={selectedNode.brightness} onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, brightness: Number(e.target.value) } : n))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Size: </label>
              <input type="number" min={1} max={32} value={selectedNode.size} onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, size: Number(e.target.value) } : n))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Placed: </label>
              <input type="checkbox" checked={selectedNode.placed} onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, placed: e.target.checked } : n))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Connections: </label>
              <div style={{ position: 'relative', marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={connectionSearch}
                  onChange={e => setConnectionSearch(e.target.value)}
                  onFocus={() => setShowConnectionDropdown(true)}
                  onBlur={() => setTimeout(() => setShowConnectionDropdown(false), 150)}
                  style={{ width: '100%', marginBottom: 4 }}
                />
                {showConnectionDropdown && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', background: '#fff', border: '1px solid #ccc', borderRadius: 4, position: 'absolute', width: '100%', zIndex: 10 }}>
                    {getFilteredConnectionOptions(selectedNode, connectionSearch).length === 0 && (
                      <div style={{ padding: 6, color: '#888' }}>No matches</div>
                    )}
                    {getFilteredConnectionOptions(selectedNode, connectionSearch).map(n => (
                      <div
                        key={n.id}
                        style={{ padding: 6, cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onMouseDown={e => e.preventDefault()}
                        onDoubleClick={() => {
                          setNodes(nodes.map(nodeItem => nodeItem.id === selectedNode.id ? { ...nodeItem, connections: [...nodeItem.connections, n.id] } : nodeItem));
                          setConnectionSearch('');
                          setShowConnectionDropdown(false);
                        }}
                      >
                        {n.name} {n.x != null && n.y != null ? `(${Math.round(n.x)},${Math.round(n.y)})` : ''}
                        {n.placed && <span style={{ color: '#3bb0e0', marginLeft: 6 }}>[Placed]</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Show current connections below */}
              <div style={{ marginTop: 4 }}>
                {selectedNode.connections.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>No connections</div>}
                {selectedNode.connections.map(connId => {
                  const connNode = nodes.find(n => n.id === connId);
                  if (!connNode) return null;
                  return (
                    <div key={connId} style={{ display: 'flex', alignItems: 'center', marginBottom: 2, background: '#f4f4f4', borderRadius: 4, padding: '2px 6px' }}>
                      <span style={{ flex: 1 }}>{connNode.name} {connNode.x != null && connNode.y != null ? `(${Math.round(connNode.x)},${Math.round(connNode.y)})` : ''}</span>
                      <button
                        style={{ marginLeft: 6, color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14 }}
                        onClick={() => setNodes(nodes.map(nodeItem => nodeItem.id === selectedNode.id ? { ...nodeItem, connections: nodeItem.connections.filter(id => id !== connId) } : nodeItem))}
                        title="Remove connection"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Add Node, Background, and Toggles moved here */}
            <div style={{ marginTop: 32, borderTop: '1px solid #ccc', paddingTop: 16 }}>
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
              <div style={{ marginTop: 8 }}>
                <label style={{ fontWeight: 600, marginRight: 8 }}>Show Background:</label>
                <input type="checkbox" checked={showBackground} onChange={e => setShowBackground(e.target.checked)} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#888' }}>Select a node to edit.</div>
        )}
      </div>
    </div>
  );
} 