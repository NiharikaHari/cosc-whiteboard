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

## Testing multi-user sync manually

Browser automation isn't used to verify this project - test it by hand with multiple tabs:

1. Open the client URL in two browser tabs side by side.
2. Draw in Tab A - the stroke should appear live in Tab B while you're still drawing, not just after you lift the mouse.
3. Draw at the same time in both tabs and confirm neither stroke corrupts the other.
4. Refresh Tab B - all previously drawn strokes should reappear immediately.
5. Click "Clear" in Tab A - Tab B's canvas should clear too, and a freshly opened Tab C should start blank.
6. Try the eraser and different colors/sizes in one tab and confirm they sync to the other.
7. Move your mouse without drawing - the other tab should show a live colored cursor at your position.
8. Close a tab and check the server's console log for a `disconnect` line and the user-count badge decrementing elsewhere.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Serves the built client and the Socket.IO server from a single process on `:3001`.
