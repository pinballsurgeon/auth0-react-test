// Controls.js

import React from 'react';

const Controls = ({ parameters, onParameterChange }) => {
  const { geometryType, complexity, rotateX, rotateY, rotateZ } = parameters;
  const { setGeometryType, setComplexity, setRotateX, setRotateY, setRotateZ } = onParameterChange;

  return (
    <div className="control-panel">
      <div className="control-group">
        <label htmlFor="geometry-type">Geometry Type:</label>
        <select
          id="geometry-type"
          value={geometryType}
          onChange={(e) => setGeometryType(e.target.value)}
        >
          <option value="Platonic Solids">Platonic Solids</option>
          {/* More options can be added here as new geometries are implemented */}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="complexity">Complexity: {complexity}</label>
        <input
          id="complexity"
          type="range"
          min="3"
          max="20"
          value={complexity}
          onChange={(e) => setComplexity(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="control-group">
        <label htmlFor="rotate-x">Rotate X: {rotateX}</label>
        <input
          id="rotate-x"
          type="range"
          min="0"
          max="360"
          value={rotateX}
          onChange={(e) => setRotateX(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="control-group">
        <label htmlFor="rotate-y">Rotate Y: {rotateY}</label>
        <input
          id="rotate-y"
          type="range"
          min="0"
          max="360"
          value={rotateY}
          onChange={(e) => setRotateY(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="control-group">
        <label htmlFor="rotate-z">Rotate Z: {rotateZ}</label>
        <input
          id="rotate-z"
          type="range"
          min="0"
          max="360"
          value={rotateZ}
          onChange={(e) => setRotateZ(parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
};

export default Controls;