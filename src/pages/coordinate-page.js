import React from 'react';
import { PageLayout } from "../../components/page-layout";
import CoordinateSpaceWithSearch from '../../components/visualization/CoordinateSpaceWithSearch';

export const CoordinateSpacePage = () => {
  return (
    <PageLayout>
      <div className="h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">3D Text Visualizer</h1>
        <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-8rem)]">
          <CoordinateSpaceWithSearch />
        </div>
      </div>
    </PageLayout>
  );
};
