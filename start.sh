#!/usr/bin/env sh
# Axiom Forge launcher for Linux and macOS.
#
# Installs dependencies (on first run, or if a previous install looks broken), then starts
# both dev servers: the API on :3000 and the UI on :5173. `npm start` is deliberately not
# used here — it runs the compiled server alone, which exposes the REST API with no UI.
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

# `node_modules` existing is not proof the install is usable: npm workspaces
# links each package/* into node_modules/@axiom-forge/*, and that link can be
# missing or broken (seen on Windows network drives, or after switching
# branches) while node_modules itself is untouched. Check the actual thing
# the dev servers need — the shared package's workspace link and its build
# output — rather than the directory's mere existence, so a broken install
# self-heals instead of failing deep inside tsx/vite with a confusing error.
if [ ! -d node_modules ] || [ ! -e node_modules/@axiom-forge/shared ]
then
	echo "Axiom Forge: installing dependencies..."
	npm install
fi

if [ ! -f packages/shared/dist/index.js ]
then
	echo "Axiom Forge: building @axiom-forge/shared..."
	# tsc's incremental buildinfo can report success without emitting if it
	# still believes a prior (now-missing) dist/ is current — remove it so
	# this is always a real, from-scratch compile.
	rm -f packages/shared/tsconfig.tsbuildinfo
	npm -w @axiom-forge/shared run build
fi

echo "Axiom Forge: starting — the UI will be at http://localhost:5173"
exec npm run dev -- "$@"
