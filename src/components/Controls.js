// Controls.js

import React from 'react';
// import { FormControl, InputLabel, Select, MenuItem, Slider, Box } from '@material-ui/core';
import { FormControl, InputLabel, Select, MenuItem, Slider, Box } from '@mui/material';


const Controls = ({ parameters, onParameterChange }) => {
  const { geometryType, complexity, rotateX, rotateY, rotateZ } = parameters;
  const { setGeometryType, setComplexity, setRotateX, setRotateY, setRotateZ } = onParameterChange;

  return (
    <Box className="control-panel" p={2}>
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
          {/* More options can be added here as new geometries are implemented */}
        </Select>
      </FormControl>

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