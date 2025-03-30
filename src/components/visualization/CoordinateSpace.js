// src/components/visualization/CoordinateSpace.js
// objective: adapt the main visualization component to use the new shared state context, and add smart inspection logging.

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
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

  // consume state and actions from the context
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

  // usePoints hook now consumes workflowData from context
  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // --- Smart Inspection Logging ---
  const loggedWorkflowRef = useRef(false); // Track if we've logged the current workflowData

  useEffect(() => {
    // log summary when workflowData becomes available or changes significantly
    // also reset log flag if workflowData becomes null (e.g., new search started)
    if (!workflowData) {
        loggedWorkflowRef.current = false; // reset flag if data cleared
        return;
    }

    // only log the details once per workflowData object
    if (workflowData && !loggedWorkflowRef.current) {
        console.groupCollapsed(`[Workflow Data Inspection] Domain: ${workflowData.domain}`); // use group for better console org

        const rated = workflowData.ratedAttributes || [];
        const successfulRatings = rated.filter(item => item.success);
        const failedRatings = rated.filter(item => !item.success);

        console.log(`Domain Members Found: ${workflowData.domainMembers?.length || 0}`);
        console.log(`Rated Attributes: Total=${rated.length}, Success=${successfulRatings.length}, Failed=${failedRatings.length}`);
        console.log(`Global Attributes:`, workflowData.globalAttributes || 'Not Fetched');
        console.log(`Batches Processed (Images): ${workflowData.batches?.length || 0}`);

        if (successfulRatings.length > 0) {
            console.log("Sample Success Item (ratedAttributes[0]):", successfulRatings[0]);
        } else {
            console.log("No successful ratings found.");
        }

        if (failedRatings.length > 0) {
            console.log(`First ${Math.min(3, failedRatings.length)} Failed Item(s):`, sampleArray(failedRatings, 3));
        } else {
            console.log("No failed ratings found.");
        }

        const pcaKeys = Object.keys(rated[0] || {}).filter(k => k.startsWith('batch') && k.endsWith('_pca')).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
        console.log("Available PCA Keys:", pcaKeys);
        console.log("Selected PCA Iteration (at log time):", selectedPcaIteration);

        console.groupEnd();
        loggedWorkflowRef.current = true; // mark this data as logged
    }
  }, [workflowData, selectedPcaIteration]); // re-run if workflowData or selected iteration changes

  useEffect(() => {
      // log details about the 'points' array whenever it changes
      if (points && points.length > 0) {
          console.groupCollapsed("[Points Array Inspection]");
          console.log(`Source: ${workflowData ? 'Derived from WorkflowData (usePcaPoints)' : 'Dummy Points'}`);
          console.log(`Length: ${points.length}`);
          console.log("Sample Raw Points (first 3):", sampleArray(points, 3));
          console.groupEnd();
      } else if (!loading) { // only log emptiness if not loading
          console.log("[Points Array Inspection] Points array is currently empty.");
      }
  }, [points, workflowData, loading]); // log when points array identity changes

  // --- End Smart Inspection Logging ---


  // setup svg defs and filters (no change)
  const setupVisualization = (svg) => {
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    return svg.append('g');
  };

  // draw points using d3
  const drawPoints = (g, pointsData, rotation) => {
    const pcaDataKey = selectedPcaIteration || ''; // get current selection
    // minimal log inside drawpoints (runs often)
    // console.log(`drawPoints using pcaDataKey: '${pcaDataKey}' on ${pointsData.length} items.`);

    const mappedPoints = pointsData.map((p, index) => {
        // Attempt to extract PCA coordinates if applicable
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) {
            return {
                id: p.member || `pca-${index}`, // use member if available
                x: p[pcaDataKey][0],
                y: p[pcaDataKey][1],
                z: p[pcaDataKey][2],
                imageUrl: p.attributes?.imageUrl || null,
                member: p.member,
                radius: 5,
                color: d3.interpolateSpectral(index / pointsData.length) // color based on index in array
            };
        }
        // Fallback for dummy points or if PCA data is missing/invalid for an item
        return {
            id: p?.member || `dummy-${index}`, // use member if available on dummy too
            x: p?.x || 0,
            y: p?.y || 0,
            z: p?.z || 0,
            imageUrl: p?.imageUrl || null,
            member: p?.member || null,
            radius: p?.radius || 5,
            color: p?.color || d3.interpolateSpectral(index / pointsData.length)
        };
    }).filter(p => // ensure coords are valid numbers
        typeof p.x === 'number' && !isNaN(p.x) &&
        typeof p.y === 'number' && !isNaN(p.y) &&
        typeof p.z === 'number' && !isNaN(p.z)
    );

    // log mapped points sample *only* if the data source changes significantly maybe? Less frequent.
    // console.log("Sample Mapped Points (first 3 for D3):", sampleArray(mappedPoints, 3));
     if (mappedPoints.length === 0 && pointsData.length > 0) {
         console.warn("drawPoints: mappedPoints resulted in an empty array, check mapping logic and source data structure.");
     }


    // use 'id' derived above as the key for D3 data binding
    const circles = g.selectAll('circle').data(mappedPoints, d => d.id);

    circles
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('filter', 'url(#glow)')
      .merge(circles)
      .attr('cx', (d) => project(d, rotation, config.zoom)[0])
      .attr('cy', (d) => project(d, rotation, config.zoom)[1]);

    circles.exit().remove();
  };


  // continuously update the visualization using our animation hook
  useAnimation((rotation) => {
    if (!d3Container.current) return;
    // add a log inside useanimation to check if it's running and selection state
    // console.log(`useAnimation frame - rotation: ${rotation}, selectedPCA: ${selectedPcaIteration}`);

    const container = d3.select(d3Container.current);
    // basic check for container size
    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) {
        // console.log("useAnimation skipped draw: container has zero dimensions.");
        return; // skip drawing if container isn't sized yet
    }


    const viewBoxX = -containerWidth / 2;
    const viewBoxY = -containerHeight / 2;
    const viewBoxWidth = containerWidth;
    const viewBoxHeight = containerHeight;

    let svg = container.select('svg');
    if (svg.empty()) {
      svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }
    let g = svg.select('g');
    if (g.empty()) {
      g = setupVisualization(svg);
    }

    g.selectAll('*').remove();
    drawPoints(g, points, rotation * config.rotationSpeed);
  }, [points, config, project, selectedPcaIteration, workflowData]); // dependencies for animation effect


  // derive available pca iteration keys for selection from context data
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        })
    : [];

  // handler for the form submission, now calls the context function
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleVisualize(searchInput);
  };


  return (
    // pass context state/setters to header and controls where needed
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
       {/* wrapper div for positioning overlay elements like selectors/messages */}
       <div className="relative w-full h-full">
            {/* pca iteration selector uses state from context */}
            {!loading && availablePcaKeys.length > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded shadow">
                <label className="block text-white text-xs mb-1 font-semibold">PCA Iteration:</label>
                <select
                  value={selectedPcaIteration}
                  onChange={(e) => setSelectedPcaIteration(e.target.value)}
                  className="p-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                >
                  {availablePcaKeys.map((key) => (
                    <option key={key} value={key}>{key.replace('_pca', '').replace('batch', 'B')}</option> // even cleaner name B0, B1...
                  ))}
                </select>
              </div>
            )}

            {/* svg container for the d3 visualization */}
            <div
              ref={d3Container}
              className="absolute inset-0 w-full h-full bg-gray-900 overflow-hidden" // use absolute positioning to fill parent
            />

            {/* optionally display loading or error messages from context state */}
            {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
            {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;