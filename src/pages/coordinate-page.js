import React from 'react';
import { PageLayout } from "../components/page-layout";
import CoordinateSpace from '../components/visualization/CoordinateSpace';

export const CoordinateSpacePage = () => {
  return (
    <PageLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">3D Coordinate Space</h1>
        <div className="bg-white rounded-lg shadow-lg min-h-[600px]">
          <CoordinateSpace />
        </div>
      </div>
    </PageLayout>
  );
};

// export default CoordinateSpacePage;