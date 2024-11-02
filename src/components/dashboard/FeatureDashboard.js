import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Cube, 
  LineChart, 
  Network, 
  Boxes,
  BrainCircuit
} from 'lucide-react';

const FeatureTile = ({ icon: Icon, title, description, path, comingSoon = false }) => (
  <Link 
    to={comingSoon ? '#' : path}
    className={`group relative flex flex-col p-6 bg-white rounded-xl shadow-md transition-all duration-300 
      ${comingSoon ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-1'}`}
  >
    <div className="flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-lg">
      <Icon className="w-8 h-8 text-blue-600" />
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
      icon: Cube,
      title: "3D Geometry Factory",
      description: "Explore and manipulate 3D geometric shapes with real-time visualization",
      path: "/geometry"
    },
    {
      icon: LineChart,
      title: "Data Visualization Studio",
      description: "Create interactive charts and graphs from your data",
      path: "/data-viz",
      comingSoon: true
    },
    {
      icon: Network,
      title: "Network Graph Analyzer",
      description: "Visualize and analyze complex network relationships",
      path: "/network",
      comingSoon: true
    },
    {
      icon: Boxes,
      title: "Matrix Operations",
      description: "Visual matrix manipulation and linear algebra tools",
      path: "/matrix",
      comingSoon: true
    },
    {
      icon: BrainCircuit,
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