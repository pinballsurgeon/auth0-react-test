import React from 'react';
import { PageLayout } from "../components/page-layout";
import D3Visualization from '../components/D3Visualization';
import { Auth0Features } from "../components/auth0-features";

export const HomePage = () => {
  return (
    <PageLayout>
      <div className="visualization-container">
        <h1>3D Spinning Cube Visualization</h1>
        <D3Visualization />
      </div>
      <Auth0Features />
    </PageLayout>
  );
};