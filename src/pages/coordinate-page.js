// auth0-react-test/src/pages/coordinate-page.js

import React from 'react';
import { PageLayout } from "../components/page-layout";
import CoordinateSpace from '../components/visualization/CoordinateSpace';

/**
 * CoordinateSpacePage
 *
 * This page now simply renders the CoordinateSpace component,
 * which handles its own state (user input, workflow triggering, etc.).
 */
export const CoordinateSpacePage = () => {
  return (
    <PageLayout>
      <CoordinateSpace />
    </PageLayout>
  );
};

export default CoordinateSpacePage;
