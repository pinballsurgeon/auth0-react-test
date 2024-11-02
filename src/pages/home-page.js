
// pages/home-page.js
import React from 'react';
import { PageLayout } from "../components/page-layout";
import FeatureDashboard from '../components/dashboard/FeatureDashboard';

export const HomePage = () => {
  return (
    <PageLayout>
      <FeatureDashboard />
    </PageLayout>
  );
};