// auth0-react-test/src/pages/coordinate-page.js

import React, { useState, useEffect } from 'react';
import { PageLayout } from "../components/page-layout";
import CoordinateSpace from '../components/visualization/CoordinateSpace';
import { runWorkflow } from '../services/WorkflowEngine';

/**
 * CoordinateSpacePage
 *
 * This page acts as the integration point for the end-to-end workflow.
 * On mount, it triggers the WorkflowEngine to fetch enriched domain data,
 * including domain members, rated attributes (with iterative PCA), and image URLs.
 *
 * The final data is then passed as props to the CoordinateSpace component,
 * which renders the 3D visualization using D3.
 */
export const CoordinateSpacePage = () => {
  // State to hold the final workflow data, loading, and any error message.
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // On component mount, run the workflow for a sample domain (e.g., "cars").
  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        // Run the workflow; you may later replace 'cars' with a dynamic domain.
        const data = await runWorkflow({ domain: 'cars' });
        setWorkflowData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
  }, []);

  // Show loading indicator while workflow data is being fetched.
  if (loading) {
    return (
      <PageLayout>
        <div>Loading workflow data...</div>
      </PageLayout>
    );
  }

  // Show error message if the workflow failed.
  if (error) {
    return (
      <PageLayout>
        <div>Error loading workflow data: {error}</div>
      </PageLayout>
    );
  }

  // Pass the enriched workflow data to the visualization component.
  return (
    <PageLayout>
      <CoordinateSpace workflowData={workflowData} />
    </PageLayout>
  );
};

export default CoordinateSpacePage;
