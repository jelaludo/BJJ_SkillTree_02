import React from 'react';
import ShapeCanvas from './components/ShapeCanvas';
import { Routes, Route } from 'react-router-dom';
import DrawShape from './components/DrawShape';
import ManualGrid from './components/ManualGrid';
import './styles/index.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<ShapeCanvas />} />
        <Route path="/draw-shape" element={<DrawShape />} />
        <Route path="/manual-grid" element={<ManualGrid />} />
      </Routes>
    </div>
  );
}

export default App; 