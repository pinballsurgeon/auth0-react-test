import React from 'react';
import { Link } from 'react-router-dom';

const CoordinateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <circle cx="8" cy="16" r="2"></circle>
    <circle cx="12" cy="10" r="2"></circle>
    <circle cx="16" cy="14" r="2"></circle>
  </svg>
);

const FeatureTile = ({ icon: Icon, title, description, path, comingSoon = false }) => (
  <Link 
    to={comingSoon ? '#' : path}
    className={`group relative flex flex-col p-6 bg-white rounded-xl shadow-md transition-all duration-300 
      ${comingSoon ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-1'}`}
  >
    <div className="flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-lg">
      <div className="w-8 h-8 text-blue-600">
        <Icon />
      </div>
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600 flex-grow">{description}</p>
    {comingSoon && (
      <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
        Coming Soon
      </div>
    )}
  </Link>
);

const FeatureDashboard = () => {
  const features = [
    {
      icon: CoordinateIcon,
      title: "3D Coordinate Space",
      description: "Interactive 3D coordinate visualization with customizable points and transformations",
      path: "/coordinate-space"
    },
    {
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      ),
      title: "Point Cloud Visualization",
      description: "Visualize and analyze large sets of 3D points with clustering and patterns",
      path: "/point-cloud",
      comingSoon: true
    },
    {
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18M3 21l18-18"></path>
        </svg>
      ),
      title: "Vector Field Analysis",
      description: "Explore and visualize 3D vector fields and their properties",
      path: "/vector-field",
      comingSoon: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">3D Data Visualization Tools</h1>
        <p className="text-xl text-gray-600">
          Explore and analyze data in three-dimensional space
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureTile key={index} {...feature} />
        ))}
      </div>
    </div>
  );
};

export default FeatureDashboard;