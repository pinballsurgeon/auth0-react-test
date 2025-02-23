// src/hooks/useVisualization.js

import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import usePcaPoints from './usePcaPoints';
import { Point } from '../models/Point';

/**
 * usePoints - Custom hook to obtain visualization points.
 *
 * This hook now always calls the necessary hooks in the same order:
 * 1. It always calls usePcaPoints to attempt to transform workflow data into points.
 * 2. It always initializes dummy point state and generates dummy points if no workflow data is available.
 *
 * The hook returns PCA-based points if workflowData exists; otherwise, it returns dummy points.
 *
 * @param {number} particleCount - Number of dummy points to generate if no PCA data.
 * @param {Object|null} workflowData - The enriched workflow output from WorkflowEngine.
 * @returns {Array} points - Array of point objects for visualization.
 */
export const usePoints = (particleCount = 50, workflowData = null) => {
  // Always call usePcaPoints. If workflowData is null, it should return an empty array.
  const pcaPoints = usePcaPoints(workflowData);

  // Always initialize state for dummy points.
  const [dummyPoints, setDummyPoints] = useState([]);

  useEffect(() => {
    // Only generate dummy points if no workflowData is provided.
    if (!workflowData) {
      const generateDummyPoints = () => {
        const newPoints = [];
        const radius = 200;
        for (let i = 0; i < particleCount; i++) {
          const t = i / (Math.max(1, particleCount - 1));
          const phi = t * Math.PI * 2;
          const x = radius * Math.cos(phi);
          const y = radius * Math.sin(phi);
          const z = (t - 0.5) * radius;
          newPoints.push(
            new Point(
              x,
              y,
              z,
              5 + Math.random() * 5, // Random radius between 5 and 10.
              d3.interpolateSpectral(t)
            )
          );
        }
        return newPoints;
      };

      setDummyPoints(generateDummyPoints());
    }
  }, [particleCount, workflowData]);

  // Return PCA points if workflowData exists; otherwise, return dummy points.
  return workflowData ? pcaPoints : dummyPoints;
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


// // src/hooks/useVisualization.js

// import { useState, useEffect } from 'react';
// import * as d3 from 'd3';
// import { Point } from '../models/Point';

// export const usePoints = (particleCount = 50) => {
//   const [points, setPoints] = useState([]);

//   useEffect(() => {
//     const generatePoints = () => {
//       const newPoints = [];
//       for (let i = 0; i < particleCount; i++) {
//         const t = i / (Math.max(1, particleCount - 1));
//         const phi = t * Math.PI * 2;
//         const radius = 200;
        
//         const x = radius * Math.cos(phi);
//         const y = radius * Math.sin(phi);
//         const z = (t - 0.5) * radius;

//         newPoints.push(
//           new Point(
//             x,
//             y,
//             z,
//             5 + Math.random() * 5,
//             d3.interpolateSpectral(t)
//           )
//         );
//       }
//       return newPoints;
//     };

//     setPoints(generatePoints());
//   }, [particleCount]);

//   return points;
// };

// export const useProjection = () => {
//   const project = (point, rotation, scale) => {
//     const angle = (rotation * Math.PI) / 180;
//     const cosA = Math.cos(angle);
//     const sinA = Math.sin(angle);

//     const projectedX = point.x * cosA - point.z * sinA;
//     const projectedY = point.y - (point.x * sinA + point.z * cosA) * 0.3;

//     return [projectedX * scale, projectedY * scale];
//   };

//   return project;
// };

// export const useAnimation = (callback, dependencies = []) => {
//   useEffect(() => {
//     let animationFrame;
//     let rotation = 0;

//     const animate = () => {
//       rotation += 1;
//       callback(rotation);
//       animationFrame = requestAnimationFrame(animate);
//     };

//     animate();

//     return () => {
//       if (animationFrame) {
//         cancelAnimationFrame(animationFrame);
//       }
//     };
//   }, dependencies);
// };