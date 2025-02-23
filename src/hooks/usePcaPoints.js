// src/hooks/usePcaPoints.js

import { useState, useEffect } from 'react';

/**
 * usePcaPoints - Custom hook to transform workflow data into visualization points.
 *
 * This hook takes the enriched workflow output from WorkflowEngine (which includes
 * ratedAttributes with one or more PCA fields such as "batch0_pca", "batch1_pca", etc.)
 * and converts it into an array of point objects for D3 visualization.
 *
 * Each point object contains:
 *   - x, y, z: 3D coordinates extracted from the latest PCA iteration.
 *   - imageUrl: The image URL associated with the domain member.
 *   - member: The name of the domain member.
 *
 * Requirements:
 *   - For each rated attribute object in workflowData.ratedAttributes, scan for keys 
 *     matching the pattern /^batch\d+_pca$/.
 *   - Select the PCA field with the highest batch number (i.e., the latest iteration).
 *   - Fallback to a default coordinate [0, 0, 0] if no PCA result is found.
 *
 * @param {Object} workflowData - The final data structure from WorkflowEngine.
 * @returns {Array} points - An array of point objects for visualization.
 */
const usePcaPoints = (workflowData) => {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    // If no workflowData or ratedAttributes are present, clear points.
    if (!workflowData || !workflowData.ratedAttributes) {
      setPoints([]);
      return;
    }

    const newPoints = workflowData.ratedAttributes.map(item => {
      // Extract the member name (fallback to "Unknown" if not provided)
      const member = item.member || 'Unknown';

      // Extract the image URL from the attributes (if available)
      const imageUrl = item.attributes && item.attributes.imageUrl ? item.attributes.imageUrl : null;

      // Find all keys that match the PCA pattern, e.g., "batch0_pca", "batch1_pca", etc.
      const pcaKeys = Object.keys(item).filter(key => /^batch\d+_pca$/.test(key));

      // Determine the latest PCA result by selecting the key with the highest batch number.
      let latestPca = null;
      if (pcaKeys.length > 0) {
        // Sort the PCA keys by the numeric batch value.
        pcaKeys.sort((a, b) => {
          const numA = parseInt(a.match(/^batch(\d+)_pca$/)[1], 10);
          const numB = parseInt(b.match(/^batch(\d+)_pca$/)[1], 10);
          return numA - numB;
        });
        // The latest PCA field is the one with the highest batch number.
        const latestPcaKey = pcaKeys[pcaKeys.length - 1];
        latestPca = item[latestPcaKey];
      }

      // If no PCA result exists, default to coordinates [0, 0, 0].
      const [x, y, z] = latestPca && Array.isArray(latestPca) && latestPca.length === 3
        ? latestPca
        : [0, 0, 0];

      // Return the point object with required properties.
      return {
        member,
        x,
        y,
        z,
        imageUrl,
      };
    });

    // Update state with the newly computed points.
    setPoints(newPoints);
  }, [workflowData]);

  return points;
};

export default usePcaPoints;
