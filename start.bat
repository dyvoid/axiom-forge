@echo off
rem Axiom Forge launcher for Windows.
rem
rem Installs dependencies on first run, then starts both dev servers: the API on
rem :3000 and the UI on :5173. `npm start` is deliberately not used here - it
rem runs the compiled server alone, which exposes the REST API with no UI.
rem
rem Extra arguments are forwarded to the server:
rem   start.bat --project "C:\path with spaces\my-world"

setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
	echo Axiom Forge: 'node' was not found on PATH.
	echo Install Node.js 18.17 or newer: https://nodejs.org
	exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
	echo Axiom Forge: 'npm' was not found on PATH.
	echo Install Node.js 18.17 or newer: https://nodejs.org
	exit /b 1
)

if not exist "node_modules" (
	echo Axiom Forge: installing dependencies ^(first run only^)...
	call npm install
	if errorlevel 1 exit /b 1
)

echo Axiom Forge: starting - the UI will be at http://localhost:5173
call npm run dev -- %*
exit /b %errorlevel%
