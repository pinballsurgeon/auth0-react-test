// src/components/visualization/CoordinateSpace.js
// objective: refactor d3 initialization to create svg/g once, and update circles within useanimation. add more rendering logs.

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
  const d3Container = useRef(null); // Ref for the container div
  const svgRef = useRef(null); // Ref for the main SVG element
  const gRef = useRef(null); // Ref for the main G element where points are drawn
  const [isD3Initialized, setIsD3Initialized] = useState(false); // Track if D3 setup ran

  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

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

  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // --- Smart Inspection Logging (Keep previous logs) ---
  // ... (keep existing workflow data and points array inspection logs) ...
  const loggedWorkflowRef = useRef(false);
  useEffect(() => {
    if (!workflowData) {
        loggedWorkflowRef.current = false;
        return;
    }
    if (workflowData && !loggedWorkflowRef.current) {
        console.groupCollapsed(`[Workflow Data Inspection] Domain: ${workflowData.domain}`);
        // ... (keep existing workflow data logs) ...
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

  useEffect(() => {
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
  // --- End Smart Inspection Logging ---


  // --- D3 Initialization Effect ---
  useEffect(() => {
    if (d3Container.current && !isD3Initialized) {
      console.log("[D3 Init] Container available. Initializing SVG and G elements.");

      const container = d3.select(d3Container.current);
      // Clear potentially old SVG if re-initializing (shouldn't happen with isD3Initialized flag but safety)
      container.select('svg').remove();

      const svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet');
      svgRef.current = svg.node(); // Store SVG node ref

      // Setup defs (glow filter) - only needs to happen once
      const defs = svg.append('defs');
      const filter = defs.append('filter').attr('id', 'glow');
      filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // Setup the main group element for drawing points
      const g = svg.append('g');
      gRef.current = g.node(); // Store G node ref

      console.log("[D3 Init] SVG and G elements created and stored in refs.", { svg: svgRef.current, g: gRef.current });
      setIsD3Initialized(true); // Mark as initialized
    }
  }, [isD3Initialized]); // Runs once when container is ready

  // --- D3 Drawing Function (minor changes) ---
  const drawPoints = (gElement, pointsData, rotation) => {
     // Select the G element using d3.select on the stored node
     const g = d3.select(gElement);
     if (g.empty()) {
         console.error("[D3 Draw] G element ref is empty! Cannot draw.");
         return;
     }

    const pcaDataKey = selectedPcaIteration || '';
    // console.log(`[D3 Draw] drawPoints called. PCA Key: '${pcaDataKey}'. Items: ${pointsData.length}`);

    const mappedPoints = pointsData.map((p, index) => {
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) {
             const [px, py, pz] = p[pcaDataKey];
             if (typeof px !== 'number' || isNaN(px) || typeof py !== 'number' || isNaN(py) || typeof pz !== 'number' || isNaN(pz)) {
                  console.warn(`[D3 Draw] Invalid PCA data for ${p.member || index}:`, p[pcaDataKey]);
                  return null;
             }
            return { id: p.member || `pca-${index}`, x: px, y: py, z: pz, imageUrl: p.attributes?.imageUrl || null, member: p.member, radius: 5, color: d3.interpolateSpectral(index / pointsData.length) };
        }
        if (typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.z === 'number') {
             return { id: p?.member || `dummy-${index}`, x: p.x, y: p.y, z: p.z, imageUrl: p?.imageUrl || null, member: p?.member || null, radius: p?.radius || 5, color: p?.color || d3.interpolateSpectral(index / pointsData.length)};
        }
        // console.warn(`[D3 Draw] Skipping invalid point data structure at index ${index}:`, p); // Can be noisy
        return null;
    }).filter(p => p !== null);

    if (pointsData.length > 0 && mappedPoints.length === 0) {
         console.error("[D3 Draw] mappedPoints array is empty despite receiving pointsData. Check mapping logic!", pointsData);
    }

    const circles = g.selectAll('circle').data(mappedPoints, d => d.id);

    const enterSelection = circles.enter().append('circle');

    // Logging attributes for entering circles (sample)
    if (!enterSelection.empty()) {
         const sampleEnter = enterSelection.datum();
         const projectedSample = project(sampleEnter, rotation, config.zoom);
         console.log(`[D3 Enter Sample] R: ${sampleEnter.radius}, Fill: ${sampleEnter.color}, CX: ${projectedSample[0]}, CY: ${projectedSample[1]}`);
    }


    enterSelection.merge(circles)
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('filter', 'url(#glow)')
      .attr('cx', (d) => {
          const projected = project(d, rotation, config.zoom);
          if (isNaN(projected[0])) {
              console.error(`[D3 Draw] NaN cx projection for point ${d.id}!`, d, projected); return 0;
          }
          return projected[0];
      })
      .attr('cy', (d) => {
          const projected = project(d, rotation, config.zoom);
           if (isNaN(projected[1])) {
              console.error(`[D3 Draw] NaN cy projection for point ${d.id}!`, d, projected); return 0;
          }
          return projected[1];
      });

    circles.exit().remove();
  };


  // --- D3 Animation Hook (Refactored) ---
  useAnimation(() => { // removed rotation from callback args, get it internally
    const container = d3Container.current;
    const svgNode = svgRef.current;
    const gNode = gRef.current; // Get G node from ref

    // Ensure D3 is initialized and container/elements exist
    if (!isD3Initialized || !container || !svgNode || !gNode) {
        // console.log("[Animation] Waiting for D3 initialization or elements.");
        return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) {
        // console.log("[Animation] Skipping draw: Container has zero dimensions.");
        return;
    }

    // Update viewBox on the persistent SVG element
    const svg = d3.select(svgNode);
    const viewBoxX = -containerWidth / 2;
    const viewBoxY = -containerHeight / 2;
    svg.attr('viewBox', `${viewBoxX} ${viewBoxY} ${containerWidth} ${containerHeight}`);

    // Clear the persistent G element before drawing
    d3.select(gNode).selectAll('*').remove();

    // Calculate rotation internally (if needed, or pass from hook if preferred)
    const rotation = (performance.now() / (1000 / 60) * config.rotationSpeed); // Simple time based rotation

    // Call drawPoints with the persistent G node and current data/rotation
    drawPoints(gNode, points, rotation);

  }, [isD3Initialized, points, config, project, selectedPcaIteration, workflowData]); // Keep dependencies that affect points or projection


  // --- Component Render ---
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        })
    : [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsD3Initialized(false); // Reset D3 flag on new search to force re-init? Maybe not needed if SVG clear works. Let's keep it simple first.
    handleVisualize(searchInput);
  };


  return (
    <VisualizationLayout
      header={
        <Header
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          handleVisualize={handleFormSubmit}
        />
      }
      controls={<Controls config={config} setConfig={setConfig} />}
    >
       <div className="relative w-full h-full">
            {!loading && availablePcaKeys.length > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded shadow">
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

            {/* The container where D3 setup happens ONCE */}
            <div
              ref={d3Container}
              id="d3-visualization-container"
              className="absolute inset-0 w-full h-full bg-gray-800 overflow-hidden"
              style={{ border: '1px dashed lime' }} // TEMPORARY: Add border to visually confirm container exists/is sized
            >
             {/* SVG WILL BE APPENDED HERE BY THE useEffect HOOK */}
            </div>

            {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
            {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;