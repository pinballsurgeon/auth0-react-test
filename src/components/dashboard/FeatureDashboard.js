import React from 'react';
import { Link } from 'react-router-dom';

// Simple SVG icons as components
const CubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"></line>
    <line x1="18" y1="20" x2="18" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="16"></line>
  </svg>
);

const NetworkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <circle cx="4" cy="8" r="2"></circle>
    <circle cx="20" cy="8" r="2"></circle>
    <circle cx="4" cy="16" r="2"></circle>
    <circle cx="20" cy="16" r="2"></circle>
    <line x1="12" y1="9" x2="12" y2="15"></line>
    <line x1="4" y1="10" x2="4" y2="14"></line>
    <line x1="20" y1="10" x2="20" y2="14"></line>
    <line x1="6" y1="8" x2="10" y2="10"></line>
    <line x1="14" y1="10" x2="18" y2="8"></line>
    <line x1="6" y1="16" x2="10" y2="14"></line>
    <line x1="14" y1="14" x2="18" y2="16"></line>
  </svg>
);

const MatrixIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
    <line x1="15" y1="3" x2="15" y2="21"></line>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="3" y1="15" x2="21" y2="15"></line>
  </svg>
);

const NeuralNetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2"></circle>
    <circle cx="18" cy="8" r="2"></circle>
    <circle cx="18" cy="16" r="2"></circle>
    <line x1="8" y1="12" x2="16" y2="8"></line>
    <line x1="8" y1="12" x2="16" y2="16"></line>
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
      icon: CubeIcon,
      title: "3D Geometry Factory",
      description: "Explore and manipulate 3D geometric shapes with real-time visualization",
      path: "/geometry"
    },
    {
      icon: ChartIcon,
      title: "Data Visualization Studio",
      description: "Create interactive charts and graphs from your data",
      path: "/data-viz",
      comingSoon: true
    },
    {
      icon: NetworkIcon,
      title: "Network Graph Analyzer",
      description: "Visualize and analyze complex network relationships",
      path: "/network",
      comingSoon: true
    },
    {
      icon: MatrixIcon,
      title: "Matrix Operations",
      description: "Visual matrix manipulation and linear algebra tools",
      path: "/matrix",
      comingSoon: true
    },
    {
      icon: NeuralNetIcon,
      title: "Neural Network Visualizer",
      description: "Interactive neural network architecture visualization",
      path: "/neural-net",
      comingSoon: true
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Visual Mathematics Tools</h1>
        <p className="text-xl text-gray-600">
          Explore our collection of interactive mathematical visualization tools
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