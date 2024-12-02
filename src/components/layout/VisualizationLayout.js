import React from 'react';

const VisualizationLayout = ({ 
  children,
  header,
  controls,
  className = ""
}) => {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full bg-gray-900">
      {/* Optional Header */}
      {header && (
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          {header}
        </div>
      )}
      
      {/* Main Visualization Area */}
      <div className={`flex-1 min-h-0 ${className}`}>
        {children}
      </div>
      
      {/* Optional Controls */}
      {controls && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          {controls}
        </div>
      )}
    </div>
  );
};

export default VisualizationLayout;