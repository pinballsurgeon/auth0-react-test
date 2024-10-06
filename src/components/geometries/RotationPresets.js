// RotationPresets.js

export const rotationPresets = {
    'Platonic Solids': [
      // Single-Axis Rotations
      { 
        name: "0° X Rotation (Orthographic)", 
        rotateX: 0, 
        rotateY: 0, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Orthographic",
        namedAfter: "Johannes Kepler",
        description: "Orthographic projection without any rotation."
      },
      { 
        name: "45° Y Rotation (Isometric)", 
        rotateX: 35.264, // Approx arctan(1/sqrt(2))
        rotateY: 45, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Isometric",
        namedAfter: "Euclid",
        description: "Isometric projection providing equal scaling along all three axes."
      },
      
      // Multi-Axis Rotations
      { 
        name: "Dimetric Projection", 
        rotateX: 30, 
        rotateY: 45, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Dimetric",
        namedAfter: "Gustav Eiffel",
        description: "Dimetric projection with two axes scaled equally."
      },
      { 
        name: "Trimetric Projection", 
        rotateX: 20, 
        rotateY: 30, 
        rotateZ: 10,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Trimetric",
        namedAfter: "Henri Poincaré",
        description: "Trimetric projection with all three axes scaled differently."
      },
      { 
        name: "Symmetric Projection", 
        rotateX: 45, 
        rotateY: 45, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Symmetric",
        namedAfter: "Henri Poincaré",
        description: "Symmetric projection leveraging the geometry's inherent symmetries."
      },
      { 
        name: "Oblique Projection", 
        rotateX: 30, 
        rotateY: 0, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0.5, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Oblique",
        namedAfter: "Leonardo da Vinci",
        description: "Oblique projection with a 30° rotation around the X-axis and XY shear."
      },
      { 
        name: "Principal Projection", 
        rotateX: 0, 
        rotateY: 0, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Principal",
        namedAfter: "David Hilbert",
        description: "Principal projection aligning with the geometry's principal axes."
      },
      { 
        name: "Advanced Shear Projection", 
        rotateX: 25, 
        rotateY: 35, 
        rotateZ: 15,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0.3, xz: 0.2, yx: 0.1, yz: 0.4, zx: 0.2, zy: 0.3 },
        projectionType: "Shear",
        namedAfter: "Isaac Newton",
        description: "Advanced shear projection combining multi-axis rotations with shear transformations."
      },
      { 
        name: "Custom Complex Projection", 
        rotateX: 60, 
        rotateY: 45, 
        rotateZ: 30,
        scale: { x: 1.2, y: 0.8, z: 1.5 },
        shear: { xy: 0.2, xz: 0.1, yx: 0.3, yz: 0.2, zx: 0.4, zy: 0.1 },
        projectionType: "Custom",
        namedAfter: "Leonhard Euler",
        description: "Custom complex projection utilizing multi-axis rotations, scaling, and shear transformations for unique 2D projections."
      },
      // Add more multi-axis and complex presets as needed
    ],
    
    'Archimedean Solids': [
      // Example Presets for Archimedean Solids
      { 
        name: "Isometric Archimedean", 
        rotateX: 35.264, 
        rotateY: 45, 
        rotateZ: 0,
        scale: { x: 1, y: 1, z: 1 },
        shear: { xy: 0, xz: 0, yx: 0, yz: 0, zx: 0, zy: 0 },
        projectionType: "Isometric",
        namedAfter: "Euclid",
        description: "Isometric projection tailored for Archimedean solids."
      },
      // Add more Archimedean Solid presets as needed
    ],
    
    // Additional Geometry Types and Their Presets Can Be Added Here
  };
  