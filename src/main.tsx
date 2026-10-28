import React from 'react';
import { createRoot } from 'react-dom/client';
import { DioramaCanvas } from './components/DioramaCanvas';
import { HudToolbar } from './components/HudToolbar';

function App(): React.JSX.Element {
  const showHud = !new URLSearchParams(window.location.search).has('clean');
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <DioramaCanvas />
      {showHud && <HudToolbar />}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('CRITICAL: Root DOM element #root not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
