// src/components/visualization/CoordinateSpace.js
// objective: add targeted d3/rendering logs to diagnose missing visuals despite healthy data.

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
  const svgRef = useRef(null); // Ref specifically for the SVG element for logging
  const gRef = useRef(null); // Ref specifically for the G element for logging
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

  const setupVisualization = (svg) => {
    console.log("[D3 Setup] setupVisualization called."); // Log setup call
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    const g = svg.append('g');
    gRef.current = g.node(); // Store G node in ref
    console.log("[D3 Setup] <g> element created:", gRef.current);
    return g;
  };

  const drawPoints = (g, pointsData, rotation) => {
    const pcaDataKey = selectedPcaIteration || '';
    // console.log(`[D3 Draw] drawPoints called. PCA Key: '${pcaDataKey}'. Items: ${pointsData.length}`); // Keep this minimal

    const mappedPoints = pointsData.map((p, index) => {
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) {
             // check if pca data is valid numbers
             const [px, py, pz] = p[pcaDataKey];
             if (typeof px !== 'number' || isNaN(px) || typeof py !== 'number' || isNaN(py) || typeof pz !== 'number' || isNaN(pz)) {
                  console.warn(`[D3 Draw] Invalid PCA data for ${p.member || index}:`, p[pcaDataKey]);
                  return null; // Filter this out later
             }
            return { id: p.member || `pca-${index}`, x: px, y: py, z: pz, imageUrl: p.attributes?.imageUrl || null, member: p.member, radius: 5, color: d3.interpolateSpectral(index / pointsData.length) };
        }
        // check dummy points structure - assuming they have x, y, z, radius, color
        if (typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.z === 'number') {
             return { id: p?.member || `dummy-${index}`, x: p.x, y: p.y, z: p.z, imageUrl: p?.imageUrl || null, member: p?.member || null, radius: p?.radius || 5, color: p?.color || d3.interpolateSpectral(index / pointsData.length)};
        }
        console.warn(`[D3 Draw] Skipping invalid point data structure at index ${index}:`, p);
        return null; // Filter out invalid structures
    }).filter(p => p !== null); // Remove nulls added above

    if (pointsData.length > 0 && mappedPoints.length === 0) {
         console.error("[D3 Draw] mappedPoints array is empty despite receiving pointsData. Check mapping logic!", pointsData);
    }

    const circles = g.selectAll('circle').data(mappedPoints, d => d.id);

    const enterSelection = circles.enter().append('circle'); // Store enter selection

    enterSelection.merge(circles) // Merge enter and update selections
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('filter', 'url(#glow)')
      .attr('cx', (d) => {
          const projected = project(d, rotation, config.zoom);
          // --- LOG Projection ---
          // if (Math.random() < 0.05) { // Log ~5% of points per frame
          //     console.log(`[D3 Draw] Point ${d.id}: raw[${d.x.toFixed(1)},${d.y.toFixed(1)},${d.z.toFixed(1)}] -> projected[${projected[0].toFixed(1)}, ${projected[1].toFixed(1)}]`);
          // }
          if (isNaN(projected[0]) || isNaN(projected[1])) {
              console.error(`[D3 Draw] NaN projection for point ${d.id}!`, d, projected);
              return 0; // Avoid setting NaN attribute
          }
          return projected[0];
      })
      .attr('cy', (d) => {
          const projected = project(d, rotation, config.zoom);
          if (isNaN(projected[0]) || isNaN(projected[1])) {
              return 0; // Avoid setting NaN attribute
          }
          return projected[1];
      });

    const exitSelection = circles.exit(); // Store exit selection
    exitSelection.remove();

    // --- LOG D3 Update Cycle ---
    // Log counts only if they change significantly or periodically
    // Use requestAnimationFrame count or similar to log less frequently
    // console.log(`[D3 Update] Enter: ${enterSelection.size()}, Update: ${circles.size()}, Exit: ${exitSelection.size()}`);
  };


  useAnimation((rotation) => {
    const container = d3Container.current;
    if (!container) {
        // console.log("[Animation] No d3Container ref yet.");
        return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // --- LOG Container Size ---
    // console.log(`[Animation] Frame. Container size: ${containerWidth}x${containerHeight}`);
    if (containerWidth <= 0 || containerHeight <= 0) {
        // console.log("[Animation] Skipping draw: Container has zero dimensions.");
        return;
    }

    let svg = d3.select(svgRef.current); // Select using the ref
    if (svg.empty()) {
      // --- LOG SVG Creation ---
      console.log("[Animation] SVG element not found or ref empty, creating SVG.");
      svg = d3.select(container) // Select container directly
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet');
      svgRef.current = svg.node(); // Store SVG node in ref
    }

    // Setup viewBox every frame? Or just once? Let's keep it for now.
    const viewBoxX = -containerWidth / 2;
    const viewBoxY = -containerHeight / 2;
    svg.attr('viewBox', `${viewBoxX} ${viewBoxY} ${containerWidth} ${containerHeight}`);


    let g = d3.select(gRef.current); // Select using the ref
    if (g.empty()) {
        // --- LOG G Creation ---
       console.log("[Animation] G element not found or ref empty, calling setupVisualization.");
       g = setupVisualization(svg); // setupVisualization stores node in gRef now
    } else {
       // Clear G element if it already exists
       g.selectAll('*').remove();
    }

    // --- LOG Draw Call ---
    // console.log(`[Animation] Calling drawPoints with ${points.length} points.`);
    drawPoints(g, points, rotation * config.rotationSpeed);

  }, [points, config, project, selectedPcaIteration, workflowData]); // dependencies


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

            {/* The container where D3 will append the SVG */}
            {/* Ensure this div itself is visible and sized correctly */}
            <div
              ref={d3Container}
              id="d3-visualization-container" // Add ID for easier selection in dev tools
              className="absolute inset-0 w-full h-full bg-gray-800 overflow-hidden" // Changed bg slightly for visibility
            >
             {/* SVG will be appended here by D3 */}
            </div>

            {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
            {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;