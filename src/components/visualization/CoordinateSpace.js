// src/components/visualization/CoordinateSpace.js
// objective: ensure initial dummy points draw, use proper d3 update pattern in animation loop.

import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';
import { useWorkflowData } from '../../context/WorkflowDataContext';

// helper function for sampling arrays for logging
const sampleArray = (arr, count = 3) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, count);
};

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null); // Ref for the main G element where points are drawn
  const [isD3Initialized, setIsD3Initialized] = useState(false);

  // --- Local Config State ---
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

  // --- Context Data ---
  const {
    workflowData,
    loading,
    error,
    searchInput,
    selectedPcaIteration,
    setSearchInput,
    setSelectedPcaIteration,
    handleVisualize
  } = useWorkflowData();

  // --- Derived Data ---
  const points = usePoints(config.particleCount, workflowData); // Gets dummy or PCA points
  const project = useProjection();

  // --- Logging Hooks (keep as they are helpful) ---
  const loggedWorkflowRef = useRef(false);
  useEffect(() => { /* ... keep existing workflow log effect ... */
      if (!workflowData) { loggedWorkflowRef.current = false; return; }
      if (workflowData && !loggedWorkflowRef.current) {
          console.groupCollapsed(`[Workflow Data Inspection] Domain: ${workflowData.domain}`);
          const rated = workflowData.ratedAttributes || [];
          const successfulRatings = rated.filter(item => item.success);
          const failedRatings = rated.filter(item => !item.success);
          console.log(`Domain Members Found: ${workflowData.domainMembers?.length || 0}`);
          console.log(`Rated Attributes: Total=${rated.length}, Success=${successfulRatings.length}, Failed=${failedRatings.length}`);
          console.log(`Global Attributes:`, workflowData.globalAttributes || 'Not Fetched');
          console.log(`Batches Processed (Images): ${workflowData.batches?.length || 0}`);
          if (successfulRatings.length > 0) console.log("Sample Success Item (ratedAttributes[0]):", successfulRatings[0]);
          else console.log("No successful ratings found.");
          if (failedRatings.length > 0) console.log(`First ${Math.min(3, failedRatings.length)} Failed Item(s):`, sampleArray(failedRatings, 3));
          else console.log("No failed ratings found.");
          const pcaKeys = Object.keys(rated[0] || {}).filter(k => k.startsWith('batch') && k.endsWith('_pca')).sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10));
          console.log("Available PCA Keys:", pcaKeys);
          console.log("Selected PCA Iteration (at log time):", selectedPcaIteration);
          console.groupEnd();
          loggedWorkflowRef.current = true;
      }
   }, [workflowData, selectedPcaIteration]);
  useEffect(() => { /* ... keep existing points log effect ... */
      if (points && points.length > 0) {
          console.groupCollapsed("[Points Array Inspection]");
          console.log(`Source: ${workflowData ? 'Derived from WorkflowData (usePcaPoints)' : 'Dummy Points'}`);
          console.log(`Length: ${points.length}`);
          console.log("Sample Raw Points Structure (first 3):", sampleArray(points, 3));
          console.groupEnd();
      } else if (!loading) {
          console.log("[Points Array Inspection] Points array is currently empty.");
      }
  }, [points, workflowData, loading]);

  // --- D3 Drawing Function (Handles enter/update/exit) ---
  // Takes the G element node, points data, rotation, and projection config
  const drawPoints = (gElement, pointsData, rotation, projConfig) => {
     const g = d3.select(gElement);
     if (g.empty()) { console.error("[D3 Draw] G element ref is empty!"); return; }

     const pcaDataKey = selectedPcaIteration || ''; // Use selected iteration from context state

     // Map data to a consistent structure { id, x, y, z, radius, color, ... }
     const mappedPoints = pointsData.map((p, index) => {
        // PCA data path
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) {
             const [px, py, pz] = p[pcaDataKey];
             if (typeof px !== 'number' || isNaN(px) || typeof py !== 'number' || isNaN(py) || typeof pz !== 'number' || isNaN(pz)) return null;
             return { id: p.member || `pca-${index}-${pcaDataKey}`, x: px, y: py, z: pz, imageUrl: p.attributes?.imageUrl || null, member: p.member, radius: 5, color: d3.interpolateSpectral(index / pointsData.length) };
        }
        // Dummy data path (assuming Point class structure or similar)
        if (!workflowData && typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.z === 'number') {
             return { id: p?.member || `dummy-${index}`, x: p.x, y: p.y, z: p.z, imageUrl: p?.imageUrl || null, member: p?.member || null, radius: p?.radius || 5, color: p?.color || d3.interpolateSpectral(index / pointsData.length)};
        }
        return null; // Skip invalid data points
     }).filter(p => p !== null); // Filter out the nulls

     // Data Join: Bind mappedPoints to circles using the 'id' as the key
     const circles = g.selectAll('circle')
       .data(mappedPoints, d => d.id);

     // Exit: Remove circles that no longer have corresponding data
     circles.exit()
       // .transition().duration(200).attr('r', 0) // Optional: add exit transition
       .remove();

     // Enter: Append new circles for new data points
     circles.enter()
       .append('circle')
       .attr('r', 0) // Start with radius 0 for entry transition
       .attr('fill', (d) => d.color)
       .attr('filter', 'url(#glow)')
       .attr('cx', d => project(d, rotation, projConfig.zoom)[0]) // Set initial position
       .attr('cy', d => project(d, rotation, projConfig.zoom)[1])
       // .transition().duration(500) // Optional: entry transition
       .attr('r', (d) => d.radius) // Transition to final radius
       .merge(circles) // Merge Enter + Update selections
       // Update: Update attributes for circles corresponding to existing data
       // .transition().duration(100) // Optional: update transition (can make it jerky)
       .attr('r', (d) => d.radius) // Ensure radius is correct
       .attr('fill', (d) => d.color) // Ensure color is correct (might change later)
       .attr('cx', (d) => {
           const projected = project(d, rotation, projConfig.zoom);
           return isNaN(projected[0]) ? 0 : projected[0];
       })
       .attr('cy', (d) => {
           const projected = project(d, rotation, projConfig.zoom);
           return isNaN(projected[1]) ? 0 : projected[1];
       });
  };

  // --- D3 Initialization Effect ---
  useEffect(() => {
    // Run only once when container ref is ready
    if (d3Container.current && !isD3Initialized) {
      console.log("[D3 Init] Initializing SVG and G elements.");
      const container = d3.select(d3Container.current);
      container.select('svg').remove(); // Clear previous (safety)

      const svg = container.append('svg')
        .attr('width', '100%').attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet');
      svgRef.current = svg.node();

      // Setup defs
      const defs = svg.append('defs');
      /* ... glow filter setup ... */
       const filter = defs.append('filter').attr('id', 'glow');
       filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
       const feMerge = filter.append('feMerge');
       feMerge.append('feMergeNode').attr('in', 'coloredBlur');
       feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Setup main group
      const g = svg.append('g');
      gRef.current = g.node();

      // --- Perform Initial Draw ---
      // Use the initial 'points' state (should be dummy points)
      // Use initial config for zoom
      // Calculate initial size for viewbox
      const initialWidth = d3Container.current.clientWidth;
      const initialHeight = d3Container.current.clientHeight;
      if(initialWidth > 0 && initialHeight > 0) {
         svg.attr('viewBox', `${-initialWidth / 2} ${-initialHeight / 2} ${initialWidth} ${initialHeight}`);
         console.log("[D3 Init] Performing initial draw with dummy points (if any).");
         // Initial rotation can be 0 or a fixed value
         drawPoints(gRef.current, points, 0, config);
      } else {
         console.warn("[D3 Init] Container has zero dimensions during init, initial draw skipped.");
      }
      // -------------------------

      console.log("[D3 Init] SVG and G elements created.");
      setIsD3Initialized(true);
    }
  }, [isD3Initialized, points, config]); // Add points and config to dependency array to ensure initial draw uses correct initial state

  // --- D3 Animation Hook (Refactored for Update only) ---
  useAnimation((frameRotation) => { // Use frameRotation from hook
    const container = d3Container.current;
    const svgNode = svgRef.current;
    const gNode = gRef.current;

    // Only run if D3 setup is complete and elements exist
    if (!isD3Initialized || !container || !svgNode || !gNode) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    // Update viewBox continuously for responsiveness (can be optimized later if needed)
    const svg = d3.select(svgNode);
    svg.attr('viewBox', `${-containerWidth / 2} ${-containerHeight / 2} ${containerWidth} ${containerHeight}`);

    // --- REMOVED: selectAll('*').remove() ---

    // Calculate current rotation based on speed
    const rotation = frameRotation * config.rotationSpeed;

    // Call drawPoints to handle data join (enter/update/exit)
    // Pass the G node, current points array, rotation, and projection config
    drawPoints(gNode, points, rotation, config);

  }, [isD3Initialized, points, config, project, selectedPcaIteration, workflowData]); // Dependencies that trigger redraw/update


  // --- Component Render ---
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10))
    : [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Maybe reset D3 init flag if you want SVG recreated? Usually not needed.
    // setIsD3Initialized(false);
    handleVisualize(searchInput);
  };

  return (
    <VisualizationLayout
      header={<Header searchInput={searchInput} setSearchInput={setSearchInput} handleVisualize={handleFormSubmit}/>}
      controls={<Controls config={config} setConfig={setConfig} />}
    >
       <div className="relative w-full h-full">
            {/* PCA Selector */}
            {!loading && availablePcaKeys.length > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded shadow">
                {/* ... select dropdown ... */}
                 <label className="block text-white text-xs mb-1 font-semibold">PCA Iteration:</label>
                 <select
                   value={selectedPcaIteration}
                   onChange={(e) => setSelectedPcaIteration(e.target.value)}
                   className="p-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                 >
                   {availablePcaKeys.map((key) => (
                     <option key={key} value={key}>{key.replace('_pca', '').replace('batch', 'B')}</option>
                   ))}
                 </select>
              </div>
            )}

            {/* D3 Container */}
            <div
              ref={d3Container}
              id="d3-visualization-container"
              className="absolute inset-0 w-full h-full bg-gray-800 overflow-hidden"
              // style={{ border: '1px dashed lime' }} // Remove temporary border if visuals appear
            >
             {/* SVG APPENDED HERE */}
            </div>

            {/* Loading / Error Messages */}
            {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
            {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;