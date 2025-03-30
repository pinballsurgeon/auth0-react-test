// src/components/visualization/CoordinateSpace.js
// objective: restore original layout constraints to fix container growth, keep context/d3 logic.

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
  const d3Container = useRef(null); // Ref for the container div where D3 draws
  const svgRef = useRef(null);
  const gRef = useRef(null);
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
  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // --- Logging Hooks (keep logging) ---
  const loggedWorkflowRef = useRef(false);
  useEffect(() => { /* ... keep existing workflow log effect ... */
      if (!workflowData) { loggedWorkflowRef.current = false; return; }
      if (workflowData && !loggedWorkflowRef.current) {
          console.groupCollapsed(`[Workflow Data Inspection] Domain: ${workflowData.domain}`);
          // ... (full log details) ...
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
  // drawPoints function remains the same as the previous working version
  const drawPoints = (gElement, pointsData, rotation, projConfig) => {
     const g = d3.select(gElement);
     if (g.empty()) { console.error("[D3 Draw] G element ref is empty!"); return; }
     const pcaDataKey = selectedPcaIteration || '';
     const mappedPoints = pointsData.map((p, index) => {
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) {
             const [px, py, pz] = p[pcaDataKey];
             if (typeof px !== 'number' || isNaN(px) || typeof py !== 'number' || isNaN(py) || typeof pz !== 'number' || isNaN(pz)) return null;
             return { id: p.member || `pca-${index}-${pcaDataKey}`, x: px, y: py, z: pz, imageUrl: p.attributes?.imageUrl || null, member: p.member, radius: 5, color: d3.interpolateSpectral(index / pointsData.length) };
        }
        if (!workflowData && typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.z === 'number') {
             return { id: p?.member || `dummy-${index}`, x: p.x, y: p.y, z: p.z, imageUrl: p?.imageUrl || null, member: p?.member || null, radius: p?.radius || 5, color: p?.color || d3.interpolateSpectral(index / pointsData.length)};
        }
        return null;
     }).filter(p => p !== null);
     const circles = g.selectAll('circle').data(mappedPoints, d => d.id);
     circles.exit().remove();
     circles.enter().append('circle')
       .attr('r', 0).attr('fill', (d) => d.color).attr('filter', 'url(#glow)')
       .attr('cx', d => project(d, rotation, projConfig.zoom)[0])
       .attr('cy', d => project(d, rotation, projConfig.zoom)[1])
       .attr('r', (d) => d.radius) // enter transition handled here implicitly by setting r=0 then r=radius
       .merge(circles)
       .attr('r', (d) => d.radius).attr('fill', (d) => d.color) // update existing
       .attr('cx', (d) => { const prj = project(d, rotation, projConfig.zoom); return isNaN(prj[0]) ? 0 : prj[0]; })
       .attr('cy', (d) => { const prj = project(d, rotation, projConfig.zoom); return isNaN(prj[1]) ? 0 : prj[1]; });
  };


  // --- D3 Initialization Effect ---
  // drawPoints dependency removed, as initial draw is handled slightly differently now
  useEffect(() => {
    if (d3Container.current && !isD3Initialized) {
      console.log("[D3 Init] Initializing SVG and G elements.");
      const container = d3.select(d3Container.current);
      container.select('svg').remove();

      const svg = container.append('svg')
        .attr('width', '100%').attr('height', '100%') // SVG fills the constrained container div
        .attr('preserveAspectRatio', 'xMidYMid meet');
      svgRef.current = svg.node();

      const defs = svg.append('defs');
       /* ... glow filter setup ... */
       const filter = defs.append('filter').attr('id', 'glow');
       filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
       const feMerge = filter.append('feMerge');
       feMerge.append('feMergeNode').attr('in', 'coloredBlur');
       feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const g = svg.append('g');
      gRef.current = g.node();

      // --- NO explicit initial draw here anymore ---
      // The animation loop will pick it up once initialized.

      console.log("[D3 Init] SVG and G elements created.");
      setIsD3Initialized(true); // Mark as initialized
    }
  }, [isD3Initialized]); // Runs only once when container ref is ready

  // --- D3 Animation Hook ---
  // drawPoints dependency removed as it's stable
  useAnimation((frameRotation) => {
    const container = d3Container.current; // The constrained div
    const svgNode = svgRef.current;
    const gNode = gRef.current;

    if (!isD3Initialized || !container || !svgNode || !gNode) return; // Wait for init

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return; // Wait for size

    // Update viewBox based on current container size
    const svg = d3.select(svgNode);
    svg.attr('viewBox', `${-containerWidth / 2} ${-containerHeight / 2} ${containerWidth} ${containerHeight}`);

    const rotation = frameRotation * config.rotationSpeed;
    // Update points using the standard D3 pattern
    drawPoints(gNode, points, rotation, config);

  }, [isD3Initialized, points, config, project, selectedPcaIteration, workflowData]); // Dependencies


  // --- Component Render ---
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10))
    : [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // When submitting a new search, we should probably reset the D3 initialized flag
    // so the SVG gets recreated cleanly for the potentially different data/state.
    setIsD3Initialized(false);
    handleVisualize(searchInput);
  };

  // --- RETURN STATEMENT REVISED TO MATCH ORIGINAL LAYOUT CONCEPT ---
  return (
    <VisualizationLayout
      header={<Header searchInput={searchInput} setSearchInput={setSearchInput} handleVisualize={handleFormSubmit}/>}
      controls={<Controls config={config} setConfig={setConfig} />}
    >
      {/*
         This outer div acts as the flex container provided by VisualizationLayout's children area.
         We make it relative so the absolute positioned overlays work correctly within this area.
         Use flex utilities to center the D3 container.
      */}
      <div className="relative w-full h-full flex items-center justify-center p-4"> {/* Added padding */}

          {/* PCA Selector - Positioned absolute relative to the outer container */}
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

          {/* D3 Container - Explicitly Sized and Centered */}
          <div
            ref={d3Container}
            id="d3-visualization-container"
            className="bg-gray-900 overflow-hidden shadow-lg" // Use different bg, remove w/h classes
            style={{ // Apply the original sizing constraints
              // margin: 'auto', // Centering handled by parent flex
              width: '70%', // Adjusted size, make it responsive
              maxWidth: '70vh', // Limit size based on viewport height too
              maxHeight: '80vh', // Explicit max height
              aspectRatio: '1 / 1', // Force square
              // minHeight: 0, // Less relevant without flex context directly on it
            }}
          >
            {/* SVG is appended here by D3 Init Effect */}
          </div>

          {/* Loading / Error Messages - Positioned absolute relative to the outer container */}
          {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
          {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
      </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;