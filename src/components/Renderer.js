// Renderer.js

import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { rotatePoint, scalePoint, shearPoint } from './transformations';

const Renderer = ({ geometry, rotateX, rotateY, rotateZ, scaleX, scaleY, scaleZ, shearXY, shearXZ, shearYX, shearYZ, shearZX, shearZY }) => {
  const d3Container = useRef(null);

  useEffect(() => {
    if (!d3Container.current) {
      console.error('SVG container reference is null');
      return;
    }

    // Clear previous SVG content
    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove();

    // Set up responsive SVG attributes
    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Create group for geometry and center it
    const g = svg.append('g');

    // Apply transformations to vertices
    const { vertices, faces, edges } = geometry;
    const transformedVertices = vertices.map((point) => {
      let transformedPoint = rotatePoint(point, rotateX, rotateY, rotateZ);
      transformedPoint = scalePoint(transformedPoint, scaleX, scaleY, scaleZ);
      transformedPoint = shearPoint(transformedPoint, shearXY, shearXZ, shearYX, shearYZ, shearZX, shearZY);
      return transformedPoint;
    });

    // Scale and translate vertices to fit in the SVG
    const xExtent = d3.extent(transformedVertices, (d) => d[0]);
    const yExtent = d3.extent(transformedVertices, (d) => d[1]);
    const boundingWidth = xExtent[1] - xExtent[0];
    const boundingHeight = yExtent[1] - yExtent[0];

    const padding = 40;
    const scale = Math.min(
      (containerWidth - 2 * padding) / boundingWidth,
      (containerHeight - 2 * padding) / boundingHeight
    );

    const finalVertices = transformedVertices.map(([x, y]) => [
      (x - (xExtent[0] + xExtent[1]) / 2) * scale + containerWidth / 2,
      (y - (yExtent[0] + yExtent[1]) / 2) * scale + containerHeight / 2,
    ]);

    // Render faces
    g.selectAll('.face')
      .data(faces)
      .enter()
      .append('polygon')
      .attr('class', 'face')
      .attr('points', (d) =>
        d.map((i) => finalVertices[i].join(',')).join(' ')
      )
      .attr('fill', '#69b3a2')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8);

    // Render edges
    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', (d) => finalVertices[d[0]][0])
      .attr('y1', (d) => finalVertices[d[0]][1])
      .attr('x2', (d) => finalVertices[d[1]][0])
      .attr('y2', (d) => finalVertices[d[1]][1])
      .attr('stroke', '#000')
      .attr('stroke-width', 1);
  }, [geometry, rotateX, rotateY, rotateZ, scaleX, scaleY, scaleZ, shearXY, shearXZ, shearYX, shearYZ, shearZX, shearZY]);

  return <svg ref={d3Container} style={{ border: '1px solid black', width: '100%', height: '100%' }}></svg>;
};

export default Renderer;