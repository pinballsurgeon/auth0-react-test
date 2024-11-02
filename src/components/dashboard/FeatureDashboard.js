import React from 'react';
import { Link } from 'react-router-dom';

// Enhanced SVG icons with better visual style
const CubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <path d="M3.3 7l8.7 5 8.7-5"></path>
    <path d="M12 22V12"></path>
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <path d="M18 17V9"></path>
    <path d="M13 17V5"></path>
    <path d="M8 17v-3"></path>
  </svg>
);

const NetworkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <circle cx="4" cy="8" r="2"></circle>
    <circle cx="20" cy="8" r="2"></circle>
    <circle cx="4" cy="16" r="2"></circle>
    <circle cx="20" cy="16" r="2"></circle>
    <path d="M12 9a9 9 0 0 0-9 9"></path>
    <path d="M12 9a9 9 0 0 1 9 9"></path>
    <path d="M7.5 8a9 9 0 0 1 9 9"></path>
    <path d="M16.5 8a9 9 0 0 0-9 9"></path>
  </svg>
);

const MatrixIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    <path d="M9 3v18"></path>
    <path d="M15 3v18"></path>
    <path d="M3 9h18"></path>
    <path d="M3 15h18"></path>
  </svg>
);

const NeuralNetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2"></circle>
    <circle cx="18" cy="8" r="2"></circle>
    <circle cx="18" cy="16" r="2"></circle>
    <path d="M8 12h4"></path>
    <path d="M14 8l2 2"></path>
    <path d="M14 16l2-2"></path>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const FeatureTile = ({ icon: Icon, title, description, path, comingSoon = false }) => (
  <Link 
    to={comingSoon ? '#' : path}
    className={`
      relative flex flex-col
      min-h-[320px] p-8
      bg-gradient-to-br from-white to-gray-50
      rounded-xl
      border border-gray-200
      shadow-sm
      transition-all duration-500 ease-in-out
      ${comingSoon 
        ? 'opacity-75 cursor-not-allowed' 
        : 'hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 hover:from-blue-50 hover:to-white'
      }
      group
    `}
  >
    {/* Icon Container with Enhanced Animation */}
    <div className="
      relative
      flex items-center justify-center
      w-20 h-20 mb-6
      bg-gradient-to-br from-blue-100 to-blue-50
      rounded-2xl
      transition-all duration-500
      group-hover:scale-110 group-hover:rotate-3
      group-hover:from-blue-200 group-hover:to-blue-100
    ">
      <div className="text-blue-600 transition-transform duration-500 group-hover:scale-110">
        <Icon />
      </div>
    </div>

    {/* Content Section */}
    <div className="flex flex-col flex-grow">
      <h3 className="
        text-2xl font-semibold mb-3
        bg-clip-text text-transparent 
        bg-gradient-to-r from-gray-900 to-gray-700
        group-hover:from-blue-800 group-hover:to-blue-600
        transition-all duration-500
      ">
        {title}
      </h3>
      <p className="
        text-gray-600 
        group-hover:text-gray-700
        transition-colors duration-500
      ">
        {description}
      </p>
    </div>

    {/* Coming Soon Badge */}
    {comingSoon && (
      <div className="
        absolute top-6 right-6
        py-1 px-3
        bg-gradient-to-r from-amber-400 to-amber-300
        text-amber-900 text-sm font-semibold
        rounded-full
        shadow-sm
      ">
        Coming Soon
      </div>
    )}

    {/* Interactive Bottom Indicator */}
    <div className="
      absolute bottom-0 left-0
      w-full h-1
      bg-gradient-to-r from-transparent via-gray-200 to-transparent
      group-hover:via-blue-400
      transition-all duration-500
      opacity-50 group-hover:opacity-100
    "/>
  </Link>
);

const FeatureDashboard = () => {
  const features = [
    {
      icon: CubeIcon,
      title: "3D Geometry Factory",
      description: "Explore and manipulate 3D geometric shapes with intuitive controls and real-time visualization. Perfect for understanding spatial relationships and geometric transformations.",
      path: "/geometry"
    },
    {
      icon: ChartIcon,
      title: "Data Visualization Studio",
      description: "Transform your data into compelling visual stories with interactive charts, graphs, and dashboards. Supports multiple chart types and real-time data updates.",
      path: "/data-viz",
      comingSoon: true
    },
    {
      icon: NetworkIcon,
      title: "Network Graph Analyzer",
      description: "Visualize and analyze complex network relationships with an intuitive force-directed layout. Perfect for social networks, system architectures, and more.",
      path: "/network",
      comingSoon: true
    },
    {
      icon: MatrixIcon,
      title: "Matrix Operations",
      description: "Interactive matrix manipulation and linear algebra visualization tool. Perform operations like multiplication, transformation, and decomposition with visual feedback.",
      path: "/matrix",
      comingSoon: true
    },
    {
      icon: NeuralNetIcon,
      title: "Neural Network Visualizer",
      description: "Design and visualize neural network architectures with an interactive builder. Understand deep learning concepts through dynamic visualization.",
      path: "/neural-net",
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Enhanced Header Section */}
        <div className="text-center mb-16">
          <h1 className="
            text-5xl font-bold mb-6
            bg-clip-text text-transparent bg-gradient-to-r 
            from-blue-900 via-blue-700 to-blue-800
          ">
            Visual Mathematics Tools
          </h1>
          <p className="
            text-xl text-gray-600 max-w-3xl mx-auto
            leading-relaxed
          ">
            Discover our collection of interactive mathematical visualization tools.
            Each tool is designed to make complex concepts intuitive and engaging.
          </p>
        </div>
        
        {/* Enhanced Grid Layout */}
        <div className="
          grid gap-8
          grid-cols-1
          md:grid-cols-2
          lg:grid-cols-3
          max-w-7xl mx-auto
        ">
          {features.map((feature, index) => (
            <FeatureTile key={index} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureDashboard;