// src/hooks/useVisualization.js

import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import usePcaPoints from './usePcaPoints';
import { Point } from '../models/Point';

/**
 * usePoints - Custom hook to obtain visualization points.
 *
 * This hook serves two purposes:
 * 1. If enriched workflow data (with PCA results) is available, it uses the new
 *    usePcaPoints hook to transform that data into an array of point objects.
 * 2. Otherwise, it falls back to generating dummy points based on particleCount.
 *
 * Each point object is expected to have:
 *   - x, y, z: 3D coordinates (from PCA or dummy generation)
 *   - imageUrl: URL for texturing (from workflow data)
 *   - member: Domain member name (for identification or tooltips)
 *
 * @param {number} particleCount - Number of dummy points to generate if no PCA data.
 * @param {Object|null} workflowData - The enriched workflow output from WorkflowEngine.
 * @returns {Array} points - Array of point objects for visualization.
 */
export const usePoints = (particleCount = 50, workflowData = null) => {
  // If workflowData is provided, we use the PCA hook to extract real data.
  if (workflowData) {
    return usePcaPoints(workflowData);
  }

  // Otherwise, generate dummy points.
  const [points, setPoints] = useState([]);

  useEffect(() => {
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
          // Point model is used to create a new point object.
          new Point(
            x,
            y,
            z,
            5 + Math.random() * 5, // Random radius between 5 and 10.
            d3.interpolateSpectral(t) // Color based on t using a spectral scale.
          )
        );
      }
      return newPoints;
    };

    setPoints(generateDummyPoints());
  }, [particleCount]);

  return points;
};

/**
 * useProjection - Custom hook that returns a projection function.
 *
 * This projection function takes a 3D point (x, y, z), applies a rotation
 * transformation and scales the result to produce a 2D coordinate suitable
 * for SVG rendering.
 *
 * The projection here is a simple rotation around the y-axis and an oblique
 * projection for a pseudo-3D effect.
 *
 * @returns {Function} project - A function that projects a 3D point given a rotation and scale.
 */
export const useProjection = () => {
  const project = (point, rotation, scale) => {
    // Convert rotation (assumed in degrees) to radians.
    const angle = (rotation * Math.PI) / 180;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Apply a simple rotation transformation around the y-axis.
    const projectedX = point.x * cosA - point.z * sinA;
    // Combine a vertical shift with a weighted sum to simulate depth.
    const projectedY = point.y - (point.x * sinA + point.z * cosA) * 0.3;

    // Scale the resulting coordinates.
    return [projectedX * scale, projectedY * scale];
  };

  return project;
};

/**
 * useAnimation - Custom hook to drive continuous animation updates.
 *
 * This hook invokes the provided callback with an ever-increasing rotation value,
 * allowing the visualization to update (e.g., for rotating the coordinate space).
 *
 * @param {Function} callback - A function that receives the current rotation value.
 * @param {Array} dependencies - Dependency array to control when the animation resets.
 */
export const useAnimation = (callback, dependencies = []) => {
  useEffect(() => {
    let animationFrame;
    let rotation = 0;

    const animate = () => {
      rotation += 1; // Increment the rotation; adjust for desired speed.
      callback(rotation);
      animationFrame = requestAnimationFrame(animate);
    };

    // Start the animation loop.
    animate();

    // Cleanup on component unmount.
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