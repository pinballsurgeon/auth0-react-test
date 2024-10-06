import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { rotatePoint } from './transformations';

const Renderer = ({ geometry, rotateX, rotateY, rotateZ, onRotationChange }) => {
  const d3Container = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState(null);

  useEffect(() => {
    if (!d3Container.current) {
      console.error('SVG container reference is null');
      return;
    }

    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove();

    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;

    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g');

    const { vertices, faces, edges } = geometry;
    const rotatedVertices = vertices.map((point) =>
      rotatePoint(point, rotateX, rotateY, rotateZ)
    );

    const xExtent = d3.extent(rotatedVertices, (d) => d[0]);
    const yExtent = d3.extent(rotatedVertices, (d) => d[1]);
    const boundingWidth = xExtent[1] - xExtent[0];
    const boundingHeight = yExtent[1] - yExtent[0];

    const padding = 40;
    const scale = Math.min(
      (containerWidth - 2 * padding) / boundingWidth,
      (containerHeight - 2 * padding) / boundingHeight
    );

    const transformedVertices = rotatedVertices.map(([x, y]) => [
      (x - (xExtent[0] + xExtent[1]) / 2) * scale + containerWidth / 2,
      (y - (yExtent[0] + yExtent[1]) / 2) * scale + containerHeight / 2,
    ]);

    g.selectAll('.face')
      .data(faces)
      .enter()
      .append('polygon')
      .attr('class', 'face')
      .attr('points', (d) =>
        d.map((i) => transformedVertices[i].join(',')).join(' ')
      )
      .attr('fill', '#69b3a2')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8);

    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('line')
      .attr('class', 'edge')
      .attr('x1', (d) => transformedVertices[d[0]][0])
      .attr('y1', (d) => transformedVertices[d[0]][1])
      .attr('x2', (d) => transformedVertices[d[1]][0])
      .attr('y2', (d) => transformedVertices[d[1]][1])
      .attr('stroke', '#000')
      .attr('stroke-width', 1);

    const handleMouseDown = (event) => {
      setIsDragging(true);
      setLastMousePosition({ x: event.clientX, y: event.clientY });
    };

    const handleMouseMove = (event) => {
      if (isDragging && lastMousePosition) {
        const deltaX = event.clientX - lastMousePosition.x;
        const deltaY = event.clientY - lastMousePosition.y;

        onRotationChange(rotateX + deltaY * 0.1, rotateY + deltaX * 0.1, rotateZ);
        setLastMousePosition({ x: event.clientX, y: event.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    svg.on('mousedown', handleMouseDown);
    svg.on('mousemove', handleMouseMove);
    svg.on('mouseup', handleMouseUp);
  }, [geometry, rotateX, rotateY, rotateZ, onRotationChange, isDragging, lastMousePosition]);

  return (
    <svg
      ref={d3Container}
      style={{ border: '1px solid black', width: '100%', height: '100%' }}
    ></svg>
  );
};

export default Renderer;
