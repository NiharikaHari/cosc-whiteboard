import { useEffect, useState } from 'react';
import { socket } from '../socket.js';

export default function PresenceCursors() {
  const [cursors, setCursors] = useState({});

  useEffect(() => {
    function handleCursorMove({ id, color, x, y }) {
      setCursors((prev) => ({ ...prev, [id]: { color, x, y } }));
    }

    function handleCursorRemove({ id }) {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    socket.on('cursor-move', handleCursorMove);
    socket.on('cursor-remove', handleCursorRemove);

    return () => {
      socket.off('cursor-move', handleCursorMove);
      socket.off('cursor-remove', handleCursorRemove);
    };
  }, []);

  return (
    <div className="presence-cursors">
      {Object.entries(cursors).map(([id, cursor]) => (
        <div
          key={id}
          className="presence-cursor"
          style={{ left: cursor.x, top: cursor.y, backgroundColor: cursor.color }}
        />
      ))}
    </div>
  );
}
