#!/usr/bin/env sh
# Axiom Forge launcher for Linux and macOS.
#
# Installs dependencies on first run, then starts both dev servers: the API on
# :3000 and the UI on :5173. `npm start` is deliberately not used here — it runs
# the compiled server alone, which exposes the REST API with no UI behind it.
#
# Extra arguments are forwarded to the server:
#   ./start.sh --project ./path/to/your/project

set -eu

cd "$(dirname "$0")"

for tool in node npm
do
	if ! command -v "$tool" >/dev/null 2>&1
	then
		echo "Axiom Forge: '$tool' was not found on PATH." >&2
		echo "Install Node.js 18.17 or newer: https://nodejs.org" >&2
		exit 1
	fi
done

if [ ! -d node_modules ]
then
	echo "Axiom Forge: installing dependencies (first run only)..."
	npm install
fi

echo "Axiom Forge: starting — the UI will be at http://localhost:5173"
exec npm run dev -- "$@"
