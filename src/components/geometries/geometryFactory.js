import { Geometry } from './Geometry';
import { generatePlatonicSolid } from './PlatonicSolids';
import { generateArchimedeanSolid } from './ArchimedeanSolids';
import { generateRegularPolygon } from './geometryUtils';

export function generateGeometry(type, parameters = {}) {
  const { complexity = 4 } = parameters;
  
  try {
    switch (type) {
      case 'Platonic Solids':
        return generatePlatonicSolid(parameters);
      case 'Archimedean Solids':
        return generateArchimedeanSolid(parameters);
      case 'Regular Polygon':
        return generateRegularPolygon(complexity);
      default:
        console.warn(`Unknown geometry type: ${type}, falling back to Platonic Solid`);
        return generatePlatonicSolid({ complexity: 4 }); // Safe fallback
    }
  } catch (error) {
    console.error('Error generating geometry:', error);
    return generatePlatonicSolid({ complexity: 4 }); // Fallback to tetrahedron
  }
}
