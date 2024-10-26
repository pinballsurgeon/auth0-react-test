// import { generatePlatonicSolid } from './PlatonicSolids';
// import { generateArchimedeanSolid } from './ArchimedeanSolids';

// export function generateGeometry(type, parameters) {
//   switch (type) {
//     case 'Platonic Solids':
//       return generatePlatonicSolid(parameters);
//     case 'Archimedean Solids':
//       return generateArchimedeanSolid(parameters.type);
//     default:
//       throw new Error(`Unknown geometry type: ${type}`);
//   }
// }

import { generateRegularPolygon, interpolateVertices } from './geometryUtils';

export function generateGeometry(type, parameters) {
  const { complexity = 4 } = parameters;
  
  switch (type) {
    case 'Platonic Solids':
      return generatePlatonicSolid(parameters);
    case 'Archimedean Solids':
      return generateArchimedeanSolid(parameters);
    case 'Regular Polygon':
      return generateRegularPolygon(complexity);
    default:
      throw new Error(`Unknown geometry type: ${type}`);
  }
}