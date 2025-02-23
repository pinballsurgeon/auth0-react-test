// src/components/visualization/VisualizationComponents.js

// A simple slider control used for rotation, zoom, and scale settings.
export const ControlSlider = ({ label, value, onChange, min, max, step }) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <span className="text-xs text-gray-400">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-blue-500"
    />
  </div>
);

// A set of control sliders to adjust visualization configuration (rotation, zoom, scale).
export const Controls = ({ config, setConfig }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-gray-900 rounded-lg">
    <ControlSlider
      label="Rotation Speed"
      value={config.rotationSpeed}
      onChange={(value) => setConfig(prev => ({ ...prev, rotationSpeed: value }))}
      min={-2}
      max={2}
      step={0.1}
    />
    <ControlSlider
      label="Zoom"
      value={config.zoom}
      onChange={(value) => setConfig(prev => ({ ...prev, zoom: value }))}
      min={0.1}
      max={20}
      step={1}
    />
    <ControlSlider
      label="Scale X"
      value={config.scaleX}
      onChange={(value) => setConfig(prev => ({ ...prev, scaleX: value }))}
      min={0.1}
      max={2}
      step={0.1}
    />
    <ControlSlider
      label="Scale Y"
      value={config.scaleY}
      onChange={(value) => setConfig(prev => ({ ...prev, scaleY: value }))}
      min={0.1}
      max={2}
      step={0.1}
    />
    <ControlSlider
      label="Scale Z"
      value={config.scaleZ}
      onChange={(value) => setConfig(prev => ({ ...prev, scaleZ: value }))}
      min={0.1}
      max={2}
      step={0.1}
    />
  </div>
);

// The Header component captures the domain query from the user.
// When the form is submitted (e.g., by clicking "Visualize"), the handleVisualize callback
// is triggered. In production, this callback will call our WorkflowEngine to start the data stream.
export const Header = ({ searchInput, setSearchInput, handleVisualize }) => (
  <form onSubmit={handleVisualize} className="max-w-2xl mx-auto">
    <div className="flex flex-col md:flex-row gap-2">
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Enter text to visualize..."
        className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="md:mt-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        Visualize
      </button>
    </div>
  </form>
);
