#!/bin/bash
cd "$(dirname "$0")"

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start backend
node server.js &
SERVER_PID=$!

# Start Vite dev server
npm run dev &
VITE_PID=$!

# Wait for Vite to be ready then open browser
sleep 3
open http://localhost:5173

echo "Typing Trainer running. Close this window to stop."
wait $VITE_PID
kill $SERVER_PID 2>/dev/null
