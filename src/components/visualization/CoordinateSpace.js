// src/components/visualization/CoordinateSpace.js

import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';
import { runWorkflow } from '../../services/WorkflowEngine';

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

  // State for our enriched workflow data from WorkflowEngine
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // State for PCA iteration selection (e.g., "batch0_pca", "batch1_pca", etc.)
  const [selectedPcaIteration, setSelectedPcaIteration] = useState('');

  // Use our updated hook to extract points from workflowData (if available)
  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // Setup SVG defs and filters for visual effects.
  const setupVisualization = (svg) => {
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    return svg.append('g');
  };

  // Draw points using D3; points can come from our workflow data.
  const drawPoints = (g, points, rotation) => {
    // Use index as key (consider a unique member id later)
    const circles = g.selectAll('circle').data(points, (d, i) => i);

    circles
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius || 5)
      .attr('fill', (d) => {
        // For now, use a simple color; later you could fill with a texture based on d.imageUrl.
        return d.imageUrl ? '#fff' : d.color || d3.interpolateSpectral(Math.random());
      })
      .attr('filter', 'url(#glow)')
      .merge(circles)
      .attr('cx', (d) => project(d, rotation, config.zoom)[0])
      .attr('cy', (d) => project(d, rotation, config.zoom)[1]);

    circles.exit().remove();
  };

  // Continuously update the visualization using our animation hook.
  useAnimation((rotation) => {
    if (!d3Container.current) return;

    // For dummy objects that have updatePosition, call that method.
    points.forEach((point) => {
      if (typeof point.updatePosition === 'function') {
        point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
      }
    });

    // Setup or retrieve our SVG container.
    const svg = d3.select(d3Container.current).select('svg');
    if (svg.empty()) {
      d3.select(d3Container.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `-250 -250 500 500`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }
    const g = svg.select('g');
    if (g.empty()) {
      setupVisualization(svg);
    }

    // Clear existing elements and redraw points.
    g.selectAll('*').remove();
    drawPoints(g, points, rotation * config.rotationSpeed);
  }, [points, config]);

  // Handle the Visualize action: trigger the asynchronous workflow.
  const handleVisualize = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    // Reset previous state.
    setWorkflowData(null);
    setError(null);
    setLoading(true);
    try {
      // Call our proven WorkflowEngine with the domain provided by the user.
      const result = await runWorkflow({ domain: searchInput });
      setWorkflowData(result);
      // Once data is received, extract available PCA iteration keys (e.g. "batch0_pca", "batch1_pca", etc.)
      if (result && result.ratedAttributes && result.ratedAttributes.length > 0) {
        const pcaKeys = Object.keys(result.ratedAttributes[0]).filter(key => key.startsWith('batch'));
        if (pcaKeys.length > 0) {
          setSelectedPcaIteration(pcaKeys[0]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Derive available PCA iteration keys for selection.
  const availablePcaKeys = workflowData && workflowData.ratedAttributes && workflowData.ratedAttributes.length > 0
    ? Object.keys(workflowData.ratedAttributes[0]).filter((k) => k.startsWith('batch'))
    : [];

  return (
    <VisualizationLayout
      header={
        <Header
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          handleVisualize={handleVisualize}
        />
      }
      controls={<Controls config={config} setConfig={setConfig} />}
    >
      {/* PCA Iteration Selector */}
      {availablePcaKeys.length > 0 && (
        <div className="mt-4">
          <label className="block text-white mb-2">Select PCA Iteration:</label>
          <select
            value={selectedPcaIteration}
            onChange={(e) => setSelectedPcaIteration(e.target.value)}
            className="p-2 bg-gray-700 text-white rounded"
          >
            {availablePcaKeys.map((key, i) => (
              <option key={i} value={key}>{key}</option>
            ))}
          </select>
        </div>
      )}

      {/* SVG Container for the D3 visualization */}
      <div
        ref={d3Container}
        className="w-full h-full bg-gray-900 overflow-hidden"
        style={{
          margin: 'auto',
          width: '50%',
          height: '50%',
          minHeight: 0,
          maxHeight: '70%',
          aspectRatio: '1/1'
        }}
      />

      {/* Optionally display loading or error messages */}
      {loading && <div className="mt-2 text-yellow-400">Loading workflow data...</div>}
      {error && <div className="mt-2 text-red-500">Error: {error}</div>}
    </VisualizationLayout>
  );
};

export default CoordinateSpace;
