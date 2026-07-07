const CURSOR_COLORS = ['#ff3d81', '#ffcc00', '#3ec1ff', '#3ddc97', '#ff8a3d', '#b06bff'];

export const strokes = [];
export const users = new Map();

export function addStroke(stroke) {
  strokes.push(stroke);
}

export function clearStrokes() {
  strokes.length = 0;
}

export function assignUser(socketId) {
  const color = CURSOR_COLORS[users.size % CURSOR_COLORS.length];
  users.set(socketId, { color });
  return color;
}

export function removeUser(socketId) {
  users.delete(socketId);
}
