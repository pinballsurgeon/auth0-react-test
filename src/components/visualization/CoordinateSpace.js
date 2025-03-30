// src/components/visualization/CoordinateSpace.js
// objective: adapt the main visualization component to use the new shared state context.

import React, { useRef, useState, useEffect } from 'react'; // keep useState for config
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';
// import { runWorkflow } from '../../services/WorkflowEngine'; // no longer called directly here
import { useWorkflowData } from '../../context/WorkflowDataContext'; // import the context hook

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  // config state remains local as it primarily affects the 3d view rendering itself
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1, // note: scale currently only affects dummy objects in useAnimation
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50, // potentially make this dynamic later or part of config/context
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
    handleVisualize // the function to trigger the workflow is now from context
  } = useWorkflowData();

  // usePoints hook now consumes workflowData from context
  const points = usePoints(config.particleCount, workflowData); // particleCount still used for fallback
  const project = useProjection(); // this hook doesn't depend on workflow data directly

  // setup svg defs and filters for visual effects (no change needed)
  const setupVisualization = (svg) => {
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    return svg.append('g');
  };

  // draw points using d3 (no change needed, uses 'points' derived from context data)
  const drawPoints = (g, pointsData, rotation) => {
    // determine the key for pca data based on the selected iteration from context
    const pcaDataKey = selectedPcaIteration || ''; // fallback if none selected initially
    
    // map pointsData (which might be dummy or pca-based) to ensure structure for d3
    const mappedPoints = pointsData.map(p => {
        // if workflowData exists and pcaDataKey is set, extract coords from that batch
        if (workflowData && pcaDataKey && p[pcaDataKey]) {
            return {
                x: p[pcaDataKey][0],
                y: p[pcaDataKey][1],
                z: p[pcaDataKey][2],
                imageUrl: p.attributes?.imageUrl || null, // get image url from original structure
                member: p.member, // keep member name
                radius: 5, // default radius, maybe make dynamic later
                // color can be based on something later, fallback to random
                color: d3.interpolateSpectral(Math.random()) 
            };
        }
        // if it's a dummy point (like from the Point class) or no selected PCA data
        return {
            x: p.x || 0,
            y: p.y || 0,
            z: p.z || 0,
            imageUrl: p.imageUrl || null,
            member: p.member || `dummy-${Math.random()}`,
            radius: p.radius || 5,
            color: p.color || d3.interpolateSpectral(Math.random())
        };
    });

    // use member name as a key if available, otherwise index
    const circles = g.selectAll('circle').data(mappedPoints, d => d.member || d.x + '-' + d.y);

    circles
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius) // use radius from mapped point
      .attr('fill', (d) => d.color) // use color from mapped point (currently random/spectral)
      .attr('filter', 'url(#glow)')
      .merge(circles)
      .attr('cx', (d) => project(d, rotation, config.zoom)[0])
      .attr('cy', (d) => project(d, rotation, config.zoom)[1]);

    circles.exit().remove();
  };


  // continuously update the visualization using our animation hook
  // dependencies: 'points' (derived from context.workflowData) and local 'config'
  useAnimation((rotation) => {
    if (!d3Container.current) return;

    // note: this dummy object logic might be less relevant now
    // points.forEach((point) => {
    //   if (typeof point.updatePosition === 'function') {
    //     point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
    //   }
    // });

    const container = d3.select(d3Container.current);
    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;

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

    // clear existing elements and redraw points using the 'points' derived from context data
    g.selectAll('*').remove();
    // pass the raw 'points' array; drawPoints will map it based on selectedPcaIteration
    drawPoints(g, points, rotation * config.rotationSpeed);
  }, [points, config, project, selectedPcaIteration, workflowData]); // ensure relevant state is included


  // derive available pca iteration keys for selection from context data
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {}) // handle potential empty first item
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => { // sort keys numerically
            const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
        })
    : [];

  // handler for the form submission, now calls the context function
  const handleFormSubmit = (e) => {
    e.preventDefault(); // prevent default form submission
    handleVisualize(searchInput); // call context action with current search input
  };


  return (
    // pass context state/setters to header and controls where needed
    <VisualizationLayout
      header={
        <Header
          searchInput={searchInput}
          setSearchInput={setSearchInput} // pass setter from context
          handleVisualize={handleFormSubmit} // pass wrapper for context action
        />
      }
      // controls config remains local for now, pass its state/setter
      controls={<Controls config={config} setConfig={setConfig} />}
    >
      {/* pca iteration selector uses state from context */}
      {/* only show selector if data is loaded and keys exist */}
      {!loading && availablePcaKeys.length > 0 && (
        <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded"> {/* simple positioning */}
          <label className="block text-white text-xs mb-1">PCA Iteration:</label>
          <select
            value={selectedPcaIteration}
            onChange={(e) => setSelectedPcaIteration(e.target.value)} // use setter from context
            className="p-1 bg-gray-700 text-white text-xs rounded"
          >
            {availablePcaKeys.map((key) => ( // key is already unique string
              <option key={key} value={key}>{key.replace('_pca', '')}</option> // display cleaner name
            ))}
          </select>
        </div>
      )}

      {/* svg container for the d3 visualization (no change needed) */}
      <div
        ref={d3Container}
        className="w-full h-full bg-gray-900 overflow-hidden" // ensure layout handles this size
        // style={{ // style removed, let layout handle sizing
        //   margin: 'auto',
        //   width: '50%',
        //   height: '50%',
        //   minHeight: 0,
        //   maxHeight: '70%',
        //   aspectRatio: '1/1'
        // }}
      />

      {/* optionally display loading or error messages from context state */}
      {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10">Loading workflow data...</div>}
      {error && <div className="absolute bottom-4 left-4 text-red-500 z-10">Error: {error}</div>}
    </VisualizationLayout>
  );
};

export default CoordinateSpace;