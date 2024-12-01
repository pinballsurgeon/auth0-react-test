// auth0-react-test\src\components\page-layout.js

import React from "react";
import { NavBar } from "./navigation/desktop/nav-bar";
import { MobileNavBar } from "./navigation/mobile/mobile-nav-bar";

export const PageLayout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Desktop Navigation */}
      <NavBar />
      
      {/* Mobile Navigation */}
      <MobileNavBar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};
