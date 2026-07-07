import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strokes, users, addStroke, clearStrokes, assignUser, removeUser } from './state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

io.on('connection', (socket) => {
  const userColor = assignUser(socket.id);
  console.log(`[connect] ${socket.id} (${users.size} online)`);

  socket.emit('init-state', { strokes, userColor });
  io.emit('presence-update', { count: users.size });

  socket.on('stroke-start', (data) => {
    socket.broadcast.emit('stroke-start', data);
  });

  socket.on('stroke-point', (data) => {
    socket.broadcast.emit('stroke-point', data);
  });

  socket.on('stroke-end', (data) => {
    addStroke(data);
    socket.broadcast.emit('stroke-end', data);
  });

  socket.on('clear-board', () => {
    clearStrokes();
    console.log(`[clear-board] triggered by ${socket.id}`);
    io.emit('clear-board');
  });

  socket.on('cursor-move', ({ x, y }) => {
    socket.broadcast.emit('cursor-move', { id: socket.id, color: userColor, x, y });
  });

  socket.on('disconnect', () => {
    removeUser(socket.id);
    console.log(`[disconnect] ${socket.id} (${users.size} online)`);
    socket.broadcast.emit('cursor-remove', { id: socket.id });
    io.emit('presence-update', { count: users.size });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Whiteboard server listening on :${PORT}`);
});
