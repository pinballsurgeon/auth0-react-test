import React from 'react';
import { PageLayout } from "../components/page-layout";
import CoordinateSpace from '../components/visualization/CoordinateSpace';

export const CoordinateSpacePage = () => {
  return (
    <PageLayout>
      <div className="flex-1 min-h-[calc(100vh-80px)] w-full">
        <CoordinateSpace />
      </div>
    </PageLayout>
  );
};