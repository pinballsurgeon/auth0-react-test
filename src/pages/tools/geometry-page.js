// pages/tools/geometry-page.js
import React from 'react';
import { PageLayout } from "../../components/page-layout";
import D3Visualization from '../../components/geometries/D3Visualization';

export const GeometryPage = () => {
  return (
    <PageLayout>
      <div className="visualization-container">
        <h1>3D Geometry Visualization</h1>
        <D3Visualization />
      </div>
    </PageLayout>
  );
};