// Controls.js

import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Slider, 
  Box, 
  Typography, 
  Tooltip, 
  Grid 
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { rotationPresets } from './geometries/RotationPresets';

const Controls = ({ parameters, onParameterChange }) => {
  const { 
    geometryType, 
    complexity, 
    rotateX, 
    rotateY, 
    rotateZ, 
    preset,
    scaleX, 
    scaleY, 
    scaleZ,
    shearXY, 
    shearXZ, 
    shearYX, 
    shearYZ, 
    shearZX, 
    shearZY 
  } = parameters;
  
  const { 
    setGeometryType, 
    setComplexity, 
    setRotateX, 
    setRotateY, 
    setRotateZ, 
    setPreset,
    setScaleX,
    setScaleY,
    setScaleZ,
    setShearXY,
    setShearXZ,
    setShearYX,
    setShearYZ,
    setShearZX,
    setShearZY
  } = onParameterChange;

  const handlePresetChange = (event) => {
    const selectedPreset = currentPresets.find((p) => p.name === event.target.value);
    setPreset(event.target.value);
    if (selectedPreset) {
      setRotateX(selectedPreset.rotateX);
      setRotateY(selectedPreset.rotateY);
      setRotateZ(selectedPreset.rotateZ);
      setScaleX(selectedPreset.scale.x);
      setScaleY(selectedPreset.scale.y);
      setScaleZ(selectedPreset.scale.z);
      setShearXY(selectedPreset.shear.xy);
      setShearXZ(selectedPreset.shear.xz);
      setShearYX(selectedPreset.shear.yx);
      setShearYZ(selectedPreset.shear.yz);
      setShearZX(selectedPreset.shear.zx);
      setShearZY(selectedPreset.shear.zy);
    }
  };

  // Get presets based on selected geometry type
  const currentPresets = rotationPresets[geometryType] || [];

  return (
    <Box className="control-panel" p={2}>
      {/* Geometry Type Dropdown */}
      <FormControl variant="outlined" fullWidth margin="normal">
        <InputLabel id="geometry-type-label">Geometry Type</InputLabel>
        <Select
          labelId="geometry-type-label"
          value={geometryType}
          onChange={(e) => {
            setGeometryType(e.target.value);
            setPreset(''); // Reset preset on geometry change
          }}
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
          {currentPresets.map((preset) => (
            <MenuItem key={preset.name} value={preset.name}>
              <Box display="flex" alignItems="center">
                {preset.name}
                <Tooltip title={preset.description} arrow>
                  <InfoIcon fontSize="small" style={{ marginLeft: 8 }} />
                </Tooltip>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Complexity Slider */}
      <FormControl fullWidth margin="normal">
        <Typography id="complexity-slider" gutterBottom>
          Complexity
        </Typography>
        <Slider
          value={complexity}
          onChange={(e, val) => setComplexity(val)}
          min={3}
          max={20}
          valueLabelDisplay="auto"
          aria-labelledby="complexity-slider"
        />
      </FormControl>

      {/* Rotation Sliders */}
      <Box mt={2}>
        <Typography gutterBottom>Rotate X</Typography>
        <Slider
          value={rotateX}
          onChange={(e, val) => setRotateX(val)}
          min={0}
          max={360}
          step={0.1}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-x-slider"
        />
      </Box>

      <Box mt={2}>
        <Typography gutterBottom>Rotate Y</Typography>
        <Slider
          value={rotateY}
          onChange={(e, val) => setRotateY(val)}
          min={0}
          max={360}
          step={0.1}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-y-slider"
        />
      </Box>

      <Box mt={2}>
        <Typography gutterBottom>Rotate Z</Typography>
        <Slider
          value={rotateZ}
          onChange={(e, val) => setRotateZ(val)}
          min={0}
          max={360}
          step={0.1}
          valueLabelDisplay="auto"
          aria-labelledby="rotate-z-slider"
        />
      </Box>

      {/* Scaling Sliders */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Scaling
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography gutterBottom>Scale X</Typography>
            <Slider
              value={scaleX}
              onChange={(e, val) => setScaleX(val)}
              min={0.1}
              max={3}
              step={0.1}
              valueLabelDisplay="auto"
              aria-labelledby="scale-x-slider"
            />
          </Grid>
          <Grid item xs={4}>
            <Typography gutterBottom>Scale Y</Typography>
            <Slider
              value={scaleY}
              onChange={(e, val) => setScaleY(val)}
              min={0.1}
              max={3}
              step={0.1}
              valueLabelDisplay="auto"
              aria-labelledby="scale-y-slider"
            />
          </Grid>
          <Grid item xs={4}>
            <Typography gutterBottom>Scale Z</Typography>
            <Slider
              value={scaleZ}
              onChange={(e, val) => setScaleZ(val)}
              min={0.1}
              max={3}
              step={0.1}
              valueLabelDisplay="auto"
              aria-labelledby="scale-z-slider"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Shearing Sliders */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Shearing
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear XY</Typography>
            <Slider
              value={shearXY}
              onChange={(e, val) => setShearXY(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-xy-slider"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear XZ</Typography>
            <Slider
              value={shearXZ}
              onChange={(e, val) => setShearXZ(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-xz-slider"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear YX</Typography>
            <Slider
              value={shearYX}
              onChange={(e, val) => setShearYX(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-yx-slider"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear YZ</Typography>
            <Slider
              value={shearYZ}
              onChange={(e, val) => setShearYZ(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-yz-slider"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear ZX</Typography>
            <Slider
              value={shearZX}
              onChange={(e, val) => setShearZX(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-zx-slider"
            />
          </Grid>
          <Grid item xs={6}>
            <Typography gutterBottom>Shear ZY</Typography>
            <Slider
              value={shearZY}
              onChange={(e, val) => setShearZY(val)}
              min={-1}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              aria-labelledby="shear-zy-slider"
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Controls;
