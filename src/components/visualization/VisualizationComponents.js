// src/components/visualization/CoordinateSpace.js

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Header, Controls } from './VisualizationComponents';
import { runWorkflow } from '../../services/WorkflowEngine';
import { LogService } from '../../services/logService';

const CoordinateSpace = () => {
  // States for user input and workflow data.
  const [searchInput, setSearchInput] = useState('');
  const [workflowData, setWorkflowData] = useState(null); // Enriched data from workflowEngine
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  // Configuration for 3D visualization (rotation, zoom, scale).
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    zoom: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  });
  // State for PCA iteration selection (e.g., "batch0_pca", "batch1_pca", etc.)
  const [selectedPcaIteration, setSelectedPcaIteration] = useState('');
  // Reference for d3 container.
  const d3Container = useRef(null);

  // Attach LogService listener to capture logs.
  useEffect(() => {
    const logListener = (logEntry) => {
      setLogs((prev) => [...prev, logEntry]);
    };
    LogService.addListener(logListener);
    return () => {
      LogService.removeListener(logListener);
    };
  }, []);

  // Handler for running the workflow.
  const handleVisualize = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    // Reset previous state.
    setWorkflowData(null);
    setError(null);
    setLogs([]);
    setLoading(true);
    try {
      const result = await runWorkflow({
        domain: searchInput,
        selectedModel: 'GPT-3.5', // You can make this configurable if needed.
        logCallback: (entry) => setLogs((prev) => [...prev, entry]),
      });
      setWorkflowData(result);
      // When workflowData arrives, update selected PCA iteration to the first available one.
      // We assume the first batch is always available.
      if (result.ratedAttributes && result.ratedAttributes.length > 0) {
        const keys = Object.keys(result.ratedAttributes[0]).filter(k =>
          k.startsWith('batch')
        );
        if (keys.length > 0) {
          setSelectedPcaIteration(keys[0]);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update d3 visualization whenever workflowData or selected PCA iteration changes.
  useEffect(() => {
    if (!workflowData || !selectedPcaIteration) return;
    // Extract points from ratedAttributes that have the selected PCA iteration.
    // Each point includes: x, y, and optionally z (which we can map to size or color).
    const points = workflowData.ratedAttributes
      .filter(item => item.success && item.attributes && item[selectedPcaIteration])
      .map(item => {
        const [x, y, z] = item[selectedPcaIteration];
        return {
          member: item.member,
          x,
          y,
          z,
          imageUrl: item.attributes.imageUrl, // if imageUrl is set later, or you could use a placeholder
        };
      });
    
    // Clear any existing svg.
    const container = d3.select(d3Container.current);
    container.select('svg').remove();
    
    // Create a new svg.
    const svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `-250 -250 500 500`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Optionally, add a group for glow filters or other effects.
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create a group for points.
    const g = svg.append('g');

    // Create circles (or cubes) for each point.
    g.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('r', 8)  // radius of point; adjust as needed or map z to size
      .attr('fill', 'steelblue')
      .attr('filter', 'url(#glow)')
      .attr('cx', d => d.x * 20) // scale factor to map PCA coordinate to svg space
      .attr('cy', d => d.y * 20);
    
    // For a more advanced visualization, you might render textured cubes
    // using d3 or even WebGL (three.js), using d.imageUrl as the texture source.
  }, [workflowData, selectedPcaIteration, config]);

  // Derive available PCA iteration keys for the dropdown from workflowData.
  const availablePcaKeys = workflowData && workflowData.ratedAttributes && workflowData.ratedAttributes.length > 0
    ? Object.keys(workflowData.ratedAttributes[0]).filter(k => k.startsWith('batch'))
    : [];

  return (
    <div className="w-full h-full bg-gray-900 overflow-auto p-4">
      <Header
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        handleVisualize={handleVisualize}
      />
      <div className="mt-4">
        <Controls config={config} setConfig={setConfig} />
      </div>
      
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

      {/* d3 Visualization Container */}
      <div
        ref={d3Container}
        className="w-full h-96 bg-gray-800 mt-4 rounded"
        style={{ position: 'relative' }}
      />

      {/* Logs & Errors */}
      <div className="mt-4">
        {loading && <div className="text-yellow-400">Loading workflow data...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {logs.length > 0 && (
          <div className="mt-2 p-2 bg-gray-700 rounded max-h-48 overflow-auto font-mono text-sm text-white">
            {logs.map((log, i) => (
              <div key={i} className={log.type === 'error' ? 'text-red-400' : 'text-blue-400'}>
                {log.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinateSpace;
