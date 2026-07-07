# Doodle Together

A real-time collaborative whiteboard. Everyone who opens the app draws on the same shared canvas, live, via Socket.IO.

## Setup

```bash
npm install --prefix server
npm install --prefix client
npm install # root, for concurrently
```

## Run

```bash
npm run dev
```

This starts the Express/Socket.IO server on `:3001` and the Vite dev server on `:5173`. Open `http://localhost:5173`.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Serves the built client and the Socket.IO server from a single process on `:3001`.
