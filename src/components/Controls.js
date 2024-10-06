// Controls.js

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Slider, Box } from '@mui/material';
import { rotationPresets } from './geometries/RotationPresets';

const Controls = ({ parameters, onParameterChange }) => {
  const { geometryType, complexity, rotateX, rotateY, rotateZ, preset } = parameters;
  const { setGeometryType, setComplexity, setRotateX, setRotateY, setRotateZ, setPreset } = onParameterChange;

  const handlePresetChange = (event) => {
    const selectedPreset = rotationPresets.find((p) => p.name === event.target.value);
    setPreset(event.target.value);
    if (selectedPreset) {
      setRotateX(selectedPreset.rotateX);
      setRotateY(selectedPreset.rotateY);
      setRotateZ(selectedPreset.rotateZ);
    }
  };

  return (
    <Box className="control-panel" p={2}>
      {/* Geometry Type Dropdown */}
      <FormControl variant="outlined" fullWidth margin="normal">
        <InputLabel id="geometry-type-label">Geometry Type</InputLabel>
        <Select
          labelId="geometry-type-label"
          value={geometryType}
          onChange={(e) => setGeometryType(e.target.value)}
          label="Geometry Type"
        >
          <MenuItem value="Platonic Solids">Platonic Solids</MenuItem>
          <MenuItem value="Archimedean Solids">Archimedean Solids</MenuItem>
          {/* Add more geometry types as needed */}
        </Select>
      </FormControl>

      {/* Rotation Preset Dropdown */}
      <FormControl variant="outlined" fullWidth margin="normal">
        <InputLabel id="preset-label">Rotation Preset</InputLabel>
        <Select
          labelId="preset-label"
          value={preset}
          onChange={handlePresetChange}
          label="Rotation Preset"
        >
          {rotationPresets.map((preset) => (
            <MenuItem key={preset.name} value={preset.name}>
              {preset.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Complexity Slider */}
      <FormControl fullWidth margin="normal">
        <InputLabel shrink>Complexity</InputLabel>
        <Slider
          value={complexity}
          onChange={(e, val) => setComplexity(val)}
          min={3}
          max={20}
          valueLabelDisplay="auto"
          aria-labelledby="complexity-slider"
        />
      </FormControl>

      {/* Existing Sliders for Manual Rotation */}
      <FormControl fullWidth margin="normal">
        <InputLabel shrink>Rotate X</InputLabel>
        <Slider
          value={rotateX}
          onChange={(e, val) => setRotateX(val)}
          min={0}
          max={360}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-x-slider"
        />
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel shrink>Rotate Y</InputLabel>
        <Slider
          value={rotateY}
          onChange={(e, val) => setRotateY(val)}
          min={0}
          max={360}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-y-slider"
        />
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel shrink>Rotate Z</InputLabel>
        <Slider
          value={rotateZ}
          onChange={(e, val) => setRotateZ(val)}
          min={0}
          max={360}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-z-slider"
        />
      </FormControl>
    </Box>
  );
};

export default Controls;
