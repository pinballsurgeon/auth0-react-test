// src/App.js
// objective: make the shared workflow state available to the relevant parts of the application.

import { useAuth0 } from "@auth0/auth0-react";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { PageLoader } from "./components/page-loader";
import { AuthenticationGuard } from "./components/authentication-guard";
import { AdminPage } from "./pages/admin-page";
import { CallbackPage } from "./pages/callback-page";
import { HomePage } from "./pages/home-page";
import { NotFoundPage } from "./pages/not-found-page";
import { ProfilePage } from "./pages/profile-page";
import { ProtectedPage } from "./pages/protected-page";
import { PublicPage } from "./pages/public-page";
import { CoordinateSpacePage } from "./pages/coordinate-page";
// import { GeometryPage } from "./pages/tools/geometry-page";

// import the workflow data provider
import { WorkflowDataProvider } from './context/WorkflowDataContext';

export const App = () => {
  const { isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="page-layout">
        <PageLoader />
      </div>
    );
  }

  return (
    // wrap the routes that need access to the workflow context
    // in this case, we wrap all routes for simplicity, but could be more specific
    <WorkflowDataProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* <Route path="/geometry" element={<GeometryPage />} /> */}
        <Route
          path="/profile"
          element={<AuthenticationGuard component={ProfilePage} />}
        />
        <Route path="/public" element={<PublicPage />} />
        <Route
          path="/protected"
          element={<AuthenticationGuard component={ProtectedPage} />}
        />
        <Route
          path="/admin"
          element={<AuthenticationGuard component={AdminPage} />}
        />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="*" element={<NotFoundPage />} />
        {/* the coordinate space page now implicitly has access to the context */}
        <Route path="/coordinate-space" element={<CoordinateSpacePage />} />
      </Routes>
    </WorkflowDataProvider>
  );
};