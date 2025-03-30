# CODEBASE STANDARDS & GUIDELINES

## Build/Test Commands
- `npm start` - Runs dev server on port 4040
- `npm build` - Builds production-ready app
- `npm test` - Runs test suite 
- `npm lint` - Runs ESLint with auto-fix

## Code Style
- **Framework**: React 18 with React Router 6 and Auth0 integration
- **Visualization**: D3 for 3D coordinate visualization with PCA from ml-pca
- **UI Libraries**: Material UI with Emotion styled components
- **Animation**: Framer Motion for UI transitions

## Component Style
- Functional components with hooks (useVisualization, usePcaPoints)
- PascalCase for component files and component names
- camelCase for services and utility files
- WorkflowEngine orchestrates domain query processing pipeline
- Error handling via conditional rendering with fallbacks

## File Organization
- `/components/visualization` - 3D visualization components 
- `/services` - Data processing (WorkflowEngine, batchProcessor)
- `/hooks` - Custom React hooks for visualization data
- `/models` - Data models (Point)