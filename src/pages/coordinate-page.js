import React from 'react';
import { PageLayout } from "../components/page-layout";
import CoordinateSpace from '../components/visualization/CoordinateSpace';

export const CoordinateSpacePage = () => {
  return (
    <PageLayout>
      <div className="h-screen">
        <div className="h-full">
          <CoordinateSpace />
        </div>
      </div>
    </PageLayout>
  );
};
