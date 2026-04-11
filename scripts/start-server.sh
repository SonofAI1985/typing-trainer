#!/bin/bash
# Kill anything on port 3001 before starting
lsof -ti :3001 | xargs kill -9 2>/dev/null
sleep 0.5
exec /opt/homebrew/bin/node /Users/erbaodejia/typing-trainer/server.js
