import { socket } from '../socket.js';

const SWATCHES = ['#1a1a2e', '#ff3d81', '#ffcc00', '#3ec1ff', '#3ddc97', '#ff8a3d', '#b06bff', '#ffffff'];
const SIZES = [
  { label: 'S', value: 4 },
  { label: 'M', value: 10 },
  { label: 'L', value: 20 },
];

export default function Toolbar({ color, setColor, size, setSize, tool, setTool }) {
  function pickColor(swatch) {
    setColor(swatch);
    setTool('pen');
  }

  function handleClear() {
    if (window.confirm('Clear the whole board for everyone?')) {
      socket.emit('clear-board');
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            className={`swatch-btn${tool === 'pen' && color === swatch ? ' selected' : ''}`}
            style={{ backgroundColor: swatch }}
            onClick={() => pickColor(swatch)}
            aria-label={`Color ${swatch}`}
          />
        ))}
      </div>

      <div className="toolbar-group">
        {SIZES.map((s) => (
          <button
            key={s.label}
            className={`size-btn${size === s.value ? ' selected' : ''}`}
            onClick={() => setSize(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          className={`tool-btn${tool === 'eraser' ? ' selected' : ''}`}
          onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
        >
          🧽 Eraser
        </button>
        <button className="tool-btn clear-btn" onClick={handleClear}>
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
