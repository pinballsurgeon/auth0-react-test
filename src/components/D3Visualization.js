// D3Visualization.js

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { generateGeometry } from './geometries/geometryFactory';
import Renderer from './Renderer';
import Controls from './Controls';

const D3Visualization = () => {
  // State variables for geometry parameters
  const [geometryType, setGeometryType] = useState('Platonic Solids');
  const [complexity, setComplexity] = useState(4); // Tetrahedron
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [rotateZ, setRotateZ] = useState(0);
  const [preset, setPreset] = useState('0° X Rotation (Square)');

  // Generate geometry based on current parameters
  const geometry = generateGeometry(geometryType, { complexity });

  return (
    <motion.div
      className="d3-visualization-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="controls">
        <Controls
          parameters={{ geometryType, complexity, rotateX, rotateY, rotateZ, preset }}
          onParameterChange={{
            setGeometryType,
            setComplexity,
            setRotateX,
            setRotateY,
            setRotateZ,
            setPreset,
          }}
        />
      </div>
      <div className="renderer">
        <Renderer geometry={geometry} rotateX={rotateX} rotateY={rotateY} rotateZ={rotateZ} />
      </div>
    </motion.div>
  );
};

export default D3Visualization;
