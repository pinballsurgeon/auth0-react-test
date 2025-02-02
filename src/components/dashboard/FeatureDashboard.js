// /src/components/dashboard/FeatureDashboard.js
import React, { useState } from 'react';
import DevPanel from './DevPanel';
import FeatureTile from './FeatureTile';

// Instead of importing from an assets folder, import our placeholder icons:
import { CoordinateIcon, BoxIcon, NetworkIcon, CodeIcon } from './PlaceholderIcons';

const FeatureDashboard = () => {
  const [devMode, setDevMode] = useState(false);
  
  const features = [
    {
      icon: CoordinateIcon,
      title: "3D Coordinate Space",
      description: "Interactive 3D coordinate visualization with customizable points and transformations",
      path: "/coordinate-space"
    },
    {
      icon: BoxIcon,
      title: "Point Cloud Visualization",
      description: "Visualize and analyze large sets of 3D points with clustering and patterns",
      path: "/point-cloud",
      comingSoon: true
    },
    {
      icon: NetworkIcon,
      title: "Vector Field Analysis",
      description: "Explore and visualize 3D vector fields and their properties",
      path: "/vector-field",
      comingSoon: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-4 mb-4">
          <h1 className="text-4xl font-bold">3D Data Visualization Tools</h1>
          <button
            onClick={() => setDevMode(!devMode)}
            className="flex items-center gap-2 px-3 py-1 bg-gray-800 text-white rounded-full text-sm hover:bg-gray-700"
          >
            <CodeIcon />
            {devMode ? 'Hide Dev Tools' : 'Show Dev Tools'}
          </button>
        </div>
        <p className="text-xl text-gray-600">
          Explore and analyze data in three-dimensional space
        </p>
      </div>
      
      {/* Developer Panel */}
      <DevPanel isVisible={devMode} />
      
      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureTile key={index} {...feature} />
        ))}
      </div>
    </div>
  );
};

export default FeatureDashboard;
