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
  const [preset, setPreset] = useState('');
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);
  const [shearXY, setShearXY] = useState(0);
  const [shearXZ, setShearXZ] = useState(0);
  const [shearYX, setShearYX] = useState(0);
  const [shearYZ, setShearYZ] = useState(0);
  const [shearZX, setShearZX] = useState(0);
  const [shearZY, setShearZY] = useState(0);

  // Generate geometry based on current parameters
  const geometry = generateGeometry(geometryType, { complexity });

  // Rotation change handler for mouse-based rotation updates
  const handleRotationChange = (newRotateX, newRotateY, newRotateZ) => {
    setRotateX(newRotateX);
    setRotateY(newRotateY);
    setRotateZ(newRotateZ);
  };

  return (
    <motion.div
      className="d3-visualization-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="controls">
        <Controls
          parameters={{
            geometryType,
            complexity,
            rotateX,
            rotateY,
            rotateZ,
            preset,
            scaleX,
            scaleY,
            scaleZ,
            shearXY,
            shearXZ,
            shearYX,
            shearYZ,
            shearZX,
            shearZY,
          }}
          onParameterChange={{
            setGeometryType,
            setComplexity,
            setRotateX,
            setRotateY,
            setRotateZ,
            setPreset,
            setScaleX,
            setScaleY,
            setScaleZ,
            setShearXY,
            setShearXZ,
            setShearYX,
            setShearYZ,
            setShearZX,
            setShearZY,
          }}
        />
      </div>
      <div className="renderer">
        <Renderer
          geometry={geometry}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={rotateZ}
          scaleX={scaleX}
          scaleY={scaleY}
          scaleZ={scaleZ}
          shearXY={shearXY}
          shearXZ={shearXZ}
          shearYX={shearYX}
          shearYZ={shearYZ}
          shearZX={shearZX}
          shearZY={shearZY}
          onRotationChange={handleRotationChange}
        />
      </div>
    </motion.div>
  );
};

export default D3Visualization;
