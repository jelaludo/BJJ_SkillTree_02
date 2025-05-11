import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 420;
const GRID_OPTIONS = [
  { label: 'Coarse (30 x 21)', cols: 30, rows: 21 },
  { label: 'Fine (90 x 63)', cols: 90, rows: 63 },
];

const DrawShape: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'on' | 'off'>('on');
  const [gridIdx, setGridIdx] = useState(0); // 0: coarse, 1: fine
  const [shapeName, setShapeName] = useState('myShape');
  const navigate = useNavigate();

  const GRID_COLS = GRID_OPTIONS[gridIdx].cols;
  const GRID_ROWS = GRID_OPTIONS[gridIdx].rows;
  const CELL_WIDTH = CANVAS_WIDTH / GRID_COLS;
  const CELL_HEIGHT = CANVAS_HEIGHT / GRID_ROWS;

  // Draw everything
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw background image
    if (bgImage) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1.0;
    }
    // Draw grid
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_WIDTH, 0);
      ctx.lineTo(i * CELL_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j <= GRID_ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL_HEIGHT);
      ctx.lineTo(CANVAS_WIDTH, j * CELL_HEIGHT);
      ctx.stroke();
    }
    // Draw active cells
    ctx.fillStyle = '#3bb0e0';
    for (const key of activeCells) {
      const [i, j] = key.split(',').map(Number);
      ctx.fillRect(i * CELL_WIDTH, j * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    }
  };

  // Redraw on state change
  React.useEffect(() => { draw(); }, [bgImage, activeCells, GRID_COLS, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => setBgImage(img);
    img.src = URL.createObjectURL(file);
  };

  // Handle cell toggle
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const i = Math.floor(x / CELL_WIDTH);
    const j = Math.floor(y / CELL_HEIGHT);
    const key = `${i},${j}`;
    setActiveCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Drag drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const i = Math.floor(x / CELL_WIDTH);
    const j = Math.floor(y / CELL_HEIGHT);
    const key = `${i},${j}`;
    setDrawMode(activeCells.has(key) ? 'off' : 'on');
    setActiveCells(prev => {
      const next = new Set(prev);
      if (activeCells.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const handleMouseUp = () => setIsDrawing(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const i = Math.floor(x / CELL_WIDTH);
    const j = Math.floor(y / CELL_HEIGHT);
    const key = `${i},${j}`;
    setActiveCells(prev => {
      const next = new Set(prev);
      if (drawMode === 'on') {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Export shape as array of normalized coordinates
  const handleExport = () => {
    const coords = Array.from(activeCells).map(key => {
      const [i, j] = key.split(',').map(Number);
      return {
        x: (i + 0.5) / GRID_COLS,
        y: (j + 0.5) / GRID_ROWS,
      };
    });
    const json = JSON.stringify(coords, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shapeName || 'myShape'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: 600, height: 520, margin: '40px auto', position: 'relative', background: '#222', borderRadius: 12, boxShadow: '0 2px 16px #0004', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, padding: '6px 16px', fontSize: 15, borderRadius: 7, background: '#3bb0e0', color: '#fff', border: 'none', fontWeight: 600 }}>Back</button>
      <h2 style={{ color: '#fff', marginBottom: 16 }}>Draw Shape Tool</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <label style={{ color: '#fff', fontWeight: 500 }}>
          Grid:
          <select value={gridIdx} onChange={e => { setGridIdx(Number(e.target.value)); setActiveCells(new Set()); }} style={{ marginLeft: 8, fontSize: 15, borderRadius: 4 }}>
            {GRID_OPTIONS.map((opt, idx) => (
              <option key={opt.label} value={idx}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label style={{ color: '#fff', fontWeight: 500 }}>
          Shape Name:
          <input type="text" value={shapeName} onChange={e => setShapeName(e.target.value)} style={{ marginLeft: 8, fontSize: 15, borderRadius: 4, padding: '2px 6px' }} placeholder="myShape" />
        </label>
      </div>
      <input type="file" accept="image/*" style={{ marginBottom: 16 }} onChange={handleImageUpload} />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ background: '#fff', border: '1px solid #888', marginBottom: 16, cursor: 'crosshair' }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
      />
      <button onClick={handleExport} style={{ padding: '8px 20px', fontSize: 16, borderRadius: 6, background: '#3bb0e0', color: '#fff', border: 'none' }}>Export Shape</button>
    </div>
  );
};

export default DrawShape; 