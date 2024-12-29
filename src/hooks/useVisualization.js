// src/hooks/useVisualization.js

import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import { Point } from '../models/Point';

export const usePoints = (particleCount = 50) => {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const generatePoints = () => {
      const newPoints = [];
      for (let i = 0; i < particleCount; i++) {
        const t = i / (Math.max(1, particleCount - 1));
        const phi = t * Math.PI * 2;
        const radius = 200;
        
        const x = radius * Math.cos(phi);
        const y = radius * Math.sin(phi);
        const z = (t - 0.5) * radius;

        newPoints.push(
          new Point(
            x,
            y,
            z,
            5 + Math.random() * 5,
            d3.interpolateSpectral(t)
          )
        );
      }
      return newPoints;
    };

    setPoints(generatePoints());
  }, [particleCount]);

  return points;
};

export const useProjection = () => {
  const project = (point, rotation, scale) => {
    const angle = (rotation * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const projectedX = point.x * cosA - point.z * sinA;
    const projectedY = point.y - (point.x * sinA + point.z * cosA) * 0.3;

    return [projectedX * scale, projectedY * scale];
  };

  return project;
};

export const useAnimation = (callback, dependencies = []) => {
  useEffect(() => {
    let animationFrame;
    let rotation = 0;

    const animate = () => {
      rotation += 1;
      callback(rotation);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, dependencies);
};