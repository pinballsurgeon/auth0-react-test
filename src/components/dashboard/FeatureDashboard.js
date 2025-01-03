import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateDomainItems } from '../../services/devPanelService';
import { testGCPConnection } from '../../services/gcpService'; 

// Simple SVG icons as components
const CoordinateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <circle cx="8" cy="16" r="2"></circle>
    <circle cx="12" cy="10" r="2"></circle>
    <circle cx="16" cy="14" r="2"></circle>
  </svg>
);

const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"></path>
    <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"></path>
    <rect x="3" y="8" width="18" height="8"></rect>
  </svg>
);

const NetworkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M2 12h3m14 0h3M12 2v3m0 14v3"></path>
  </svg>
);

const CodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
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

const DevPanel = ({ isVisible }) => {
  const [selectedTest, setSelectedTest] = useState('domain');
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs(prev => [...prev, { message: `[${timestamp}] ${message}`, type }]);
  };

  const runDomainTest = async () => {
    if (!input.trim()) {
      addLog('Please enter a domain to test', 'error');
      return;
    }

    setLoading(true);
    addLog(`Starting domain generation test for: ${input}`);
    
    try {
      const result = await generateDomainItems(input);
      
      if (result.success) {
        addLog(`Found ${result.items.length} items in domain`);
        addLog('Sample items: ' + result.items.slice(0, 5).join(', '));
        addLog('Raw response:', 'debug');
        addLog(result.raw, 'debug');
      } else {
        addLog(`Error: ${result.error}`, 'error');
      }
    } catch (error) {
      addLog(`Test failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    switch (selectedTest) {
      case 'domain':
        await runDomainTest();
        break;
      // We'll add other test cases here later
      default:
        addLog(`Test type ${selectedTest} not implemented yet`, 'error');
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="mb-12 p-6 bg-gray-900 rounded-xl text-white">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Developer Console</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setLogs([])}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Clear Logs
          </button>
          {loading && (
            <div className="px-4 py-2 bg-yellow-600 rounded">
              Running Test...
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Controls */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Test Controls</h3>
          <div className="space-y-4">
            <select 
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            >
              <option value="domain">Domain Generation</option>
              <option value="attributes">Attribute Generation</option>
              <option value="pca">PCA Calculation</option>
              <option value="images">Image Service</option>
            </select>
            
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedTest === 'domain' ? 'Enter domain (e.g., "fruits")' : 'Test input...'}
              className="w-full p-2 bg-gray-700 rounded"
            />
            
            <button 
              className="w-full p-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={runTest}
              disabled={loading || !input.trim()}
            >
              {loading ? 'Running...' : 'Run Test'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Backend Connection Test</h4>
          <button 
            onClick={async () => {
              addLog('Testing GCP connection...');
              const result = await testGCPConnection();
              if (result.success) {
                addLog(`Connection successful! ID: ${result.data.connectionId}`);
                addLog(`Server time: ${result.data.serverTimestamp}`, 'debug');
                addLog(`Round trip: ${new Date(result.timestamp) - new Date(result.data.requestTimestamp)}ms`, 'debug');
              } else {
                addLog(`Connection failed: ${result.error}`, 'error');
              }
            }}
            className="w-full p-2 bg-purple-600 rounded hover:bg-purple-700"
            disabled={loading}
          >
            Test GCP Connection
          </button>
        </div>
      


        {/* Log Output */}
        <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Test Output</h3>
          <div className="h-64 bg-gray-900 rounded p-4 font-mono text-sm overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet... Run a test to see output.</div>
            ) : (
              logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'debug' ? 'text-gray-400' : 
                    'text-green-400'
                  }`}
                >
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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