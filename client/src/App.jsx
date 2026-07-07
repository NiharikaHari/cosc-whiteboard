import { useEffect, useState } from 'react';
import { socket } from './socket.js';
import Canvas from './components/Canvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import PresenceCursors from './components/PresenceCursors.jsx';
import './App.css';

export default function App() {
  const [color, setColor] = useState('#1a1a2e');
  const [size, setSize] = useState(10);
  const [tool, setTool] = useState('pen');
  const [userCount, setUserCount] = useState(1);

  useEffect(() => {
    function handlePresenceUpdate({ count }) {
      setUserCount(count);
    }
    socket.on('presence-update', handlePresenceUpdate);
    return () => socket.off('presence-update', handlePresenceUpdate);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖍️ Doodle Together</h1>
        <div className="presence-badge">🎨 {userCount} drawing</div>
      </header>

      <main className="canvas-card">
        <Canvas color={color} size={size} tool={tool} />
        <PresenceCursors />
      </main>

      <Toolbar
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        tool={tool}
        setTool={setTool}
      />
    </div>
  );
}
