import React, { useState } from 'react';

// Simple search icon SVG component
const SearchIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CoordinateSpaceWithSearch = () => {
  const [searchInput, setSearchInput] = useState('');
  const [activeText, setActiveText] = useState('');
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    tailLength: 50,
    particleCount: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setActiveText(searchInput);
    setConfig(prev => ({
      ...prev,
      particleCount: searchInput.length || 1 // Ensure at least 1 particle
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter text to visualize..."
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                <span className="text-sm">{searchInput.length}</span>
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <SearchIcon />
              <span className="hidden sm:inline">Visualize</span>
            </button>
          </div>
        </form>
      </div>

      {/* Visualization Area */}
      <div className="flex-1 relative">
        {activeText && (
          <div className="absolute top-4 left-4 bg-gray-900/80 text-white px-4 py-2 rounded-lg">
            Visualizing: "{activeText}" ({activeText.length} characters)
          </div>
        )}
        <div className="h-full">
          <CoordinateSpace {...config} />
        </div>
      </div>
    </div>
  );
};

export default CoordinateSpaceWithSearch;