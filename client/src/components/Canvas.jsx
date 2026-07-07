import { useEffect, useRef } from 'react';
import { socket } from '../socket.js';

const CURSOR_THROTTLE_MS = 50;
const POINT_MIN_DISTANCE = 2;

function applyStrokeStyle(ctx, { color, size, tool }) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = size;
  ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
}

function drawDot(ctx, point, style) {
  applyStrokeStyle(ctx, style);
  ctx.beginPath();
  ctx.arc(point.x, point.y, style.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

// Draws only the newest segment of a growing stroke, smoothed with a
// midpoint quadratic curve, so each incoming point is an O(1) draw call.
function drawIncrementalSegment(ctx, points, style) {
  const len = points.length;
  if (len === 1) {
    drawDot(ctx, points[0], style);
    return;
  }
  applyStrokeStyle(ctx, style);
  ctx.beginPath();
  if (len === 2) {
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    const p0 = points[len - 3];
    const p1 = points[len - 2];
    const p2 = points[len - 1];
    const startX = (p0.x + p1.x) / 2;
    const startY = (p0.y + p1.y) / 2;
    const endX = (p1.x + p2.x) / 2;
    const endY = (p1.y + p2.y) / 2;
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(p1.x, p1.y, endX, endY);
  }
  ctx.stroke();
}

// Full redraw of a completed stroke - used for init-state replay and resize.
function drawFullStroke(ctx, stroke) {
  const { points } = stroke;
  if (!points.length) return;
  if (points.length === 1) {
    drawDot(ctx, points[0], stroke);
    return;
  }
  applyStrokeStyle(ctx, stroke);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

export default function Canvas({ color, size, tool }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const cssSizeRef = useRef({ width: 0, height: 0 });

  const strokesRef = useRef([]);
  const remoteInProgressRef = useRef(new Map());
  const currentStrokeRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastEmittedPointRef = useRef(null);
  const lastCursorEmitRef = useRef(0);

  // Keep the active tool selection available inside stable event handlers.
  const activeStyleRef = useRef({ color, size, tool });
  activeStyleRef.current = { color, size, tool };

  useEffect(() => {
    function redrawAll() {
      const ctx = ctxRef.current;
      const { width, height } = cssSizeRef.current;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const stroke of strokesRef.current) drawFullStroke(ctx, stroke);
      for (const stroke of remoteInProgressRef.current.values()) drawFullStroke(ctx, stroke);
    }

    function resizeCanvas() {
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      cssSizeRef.current = { width, height };
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      redrawAll();
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function handleInitState({ strokes }) {
      strokesRef.current = strokes;
      remoteInProgressRef.current.clear();
      redrawAll();
    }

    function handleStrokeStart(data) {
      remoteInProgressRef.current.set(data.strokeId, {
        color: data.color,
        size: data.size,
        tool: data.tool,
        points: [data.point],
      });
      drawDot(ctxRef.current, data.point, data);
    }

    function handleStrokePoint(data) {
      const stroke = remoteInProgressRef.current.get(data.strokeId);
      if (!stroke) return;
      stroke.points.push(data.point);
      drawIncrementalSegment(ctxRef.current, stroke.points, stroke);
    }

    function handleStrokeEnd(data) {
      remoteInProgressRef.current.delete(data.strokeId);
      strokesRef.current.push(data);
      drawFullStroke(ctxRef.current, data);
    }

    function handleClearBoard() {
      strokesRef.current = [];
      remoteInProgressRef.current.clear();
      const { width, height } = cssSizeRef.current;
      ctxRef.current.clearRect(0, 0, width, height);
    }

    socket.on('init-state', handleInitState);
    socket.on('stroke-start', handleStrokeStart);
    socket.on('stroke-point', handleStrokePoint);
    socket.on('stroke-end', handleStrokeEnd);
    socket.on('clear-board', handleClearBoard);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      socket.off('init-state', handleInitState);
      socket.off('stroke-start', handleStrokeStart);
      socket.off('stroke-point', handleStrokePoint);
      socket.off('stroke-end', handleStrokeEnd);
      socket.off('clear-board', handleClearBoard);
    };
  }, []);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e) {
    canvasRef.current.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    const style = activeStyleRef.current;
    const stroke = { id: crypto.randomUUID(), points: [pos], color: style.color, size: style.size, tool: style.tool };
    currentStrokeRef.current = stroke;
    isDrawingRef.current = true;
    lastEmittedPointRef.current = pos;
    drawDot(ctxRef.current, pos, stroke);
    socket.emit('stroke-start', {
      strokeId: stroke.id,
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool,
      point: pos,
    });
  }

  function handlePointerMove(e) {
    const pos = getPos(e);

    const now = performance.now();
    if (now - lastCursorEmitRef.current > CURSOR_THROTTLE_MS) {
      socket.emit('cursor-move', pos);
      lastCursorEmitRef.current = now;
    }

    if (!isDrawingRef.current) return;
    const stroke = currentStrokeRef.current;
    stroke.points.push(pos);
    drawIncrementalSegment(ctxRef.current, stroke.points, stroke);

    const last = lastEmittedPointRef.current;
    if (Math.hypot(pos.x - last.x, pos.y - last.y) > POINT_MIN_DISTANCE) {
      socket.emit('stroke-point', { strokeId: stroke.id, point: pos });
      lastEmittedPointRef.current = pos;
    }
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const stroke = currentStrokeRef.current;
    strokesRef.current.push(stroke);
    socket.emit('stroke-end', {
      strokeId: stroke.id,
      color: stroke.color,
      size: stroke.size,
      tool: stroke.tool,
      points: stroke.points,
    });
    currentStrokeRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="whiteboard-canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
