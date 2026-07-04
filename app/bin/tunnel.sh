#!/usr/bin/env bash
set -e

# Preflight: check cloudflared is installed
if ! command -v cloudflared &>/dev/null; then
  echo "Error: cloudflared is not installed."
  echo "  macOS:  brew install cloudflared"
  echo "  Other:  https://github.com/cloudflare/cloudflared/releases"
  exit 1
fi

# Read port from server env file, default to 3000
PORT=3000
ENV_FILE="$(dirname "$0")/../../server/.env.development"
if [[ -f "$ENV_FILE" ]]; then
  PARSED_PORT=$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2)
  [[ -n "$PARSED_PORT" ]] && PORT="$PARSED_PORT"
fi

# Cleanup on exit
LOGFILE=$(mktemp)
cleanup() {
  echo ""
  echo "Tunnel closed."
  kill $SERVER_PID 2>/dev/null || true
  kill $TUNNEL_PID 2>/dev/null || true
  rm -f "$LOGFILE"
}
trap cleanup EXIT INT TERM

# Start the game server (suppress output)
npm run dev -w server > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

# Start cloudflared, capture logs to temp file
cloudflared tunnel --url "http://localhost:$PORT" > "$LOGFILE" 2>&1 &
TUNNEL_PID=$!

# Poll for the tunnel URL
URL=""
for i in {1..15}; do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOGFILE" 2>/dev/null | head -1)
  [[ -n "$URL" ]] && break
  sleep 1
done

if [[ -z "$URL" ]]; then
  echo "Error: Tunnel failed to start. Check your network connection."
  cat "$LOGFILE"
  exit 1
fi

echo ""
echo "✔ Game server running on port $PORT"
echo "✔ Tunnel ready:"
echo ""
echo "  $URL"
echo ""
echo "Share this URL with friends → paste into Custom server on blankwhite.cards"
echo "Press Ctrl+C to stop."

# Keep alive until ctrl+c or cloudflared exits
wait $TUNNEL_PID
