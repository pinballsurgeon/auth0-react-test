import { generatePlatonicSolid } from './PlatonicSolids';
import { generateArchimedeanSolid } from './ArchimedeanSolids';

export function generateGeometry(type, parameters) {
  switch (type) {
    case 'Platonic Solids':
      return generatePlatonicSolid(parameters);
    case 'Archimedean Solids':
      return generateArchimedeanSolid(parameters.type);
    default:
      throw new Error(`Unknown geometry type: ${type}`);
  }
}
