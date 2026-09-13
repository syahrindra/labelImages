import { useEffect } from 'react';
import { Canvas } from './components/Canvas.js';
import { useAnnotationStore } from './store/annotationStore.js';

export function App() {
  const setClasses = useAnnotationStore((state) => state.setClasses);
  const setBoxes = useAnnotationStore((state) => state.setBoxes);

  // Initialize with sample classes and a demo box for testing the canvas
  useEffect(() => {
    setClasses([
      { id: 0, name: 'cat', color: '#3b82f6' },
      { id: 1, name: 'dog', color: '#10b981' },
    ]);
  }, [setClasses, setBoxes]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Canvas Viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas imageUrl={null} />
      </div>
    </div>
  );
}
