@echo off
rem Axiom Forge launcher for Windows.
rem
rem Installs dependencies (on first run, or if a previous install looks broken), then starts
rem both dev servers: the API on :3000 and the UI on :5173. `npm start` is deliberately not
rem used here - it runs the compiled server alone, which exposes the REST API with no UI.
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

rem `node_modules` existing is not proof the install is usable: npm workspaces
rem links each package\* into node_modules\@axiom-forge\*, and that link can be
rem missing or broken (seen on network drives, or after switching branches)
rem while node_modules itself is untouched. Check the actual thing the dev
rem servers need - the shared package's workspace link and its build output -
rem rather than the directory's mere existence, so a broken install self-heals
rem instead of failing deep inside tsx/vite with a confusing error.
if not exist "node_modules" goto :install
if not exist "node_modules\@axiom-forge\shared" goto :install
goto :afterinstall

:install
echo Axiom Forge: installing dependencies...
call npm install
if errorlevel 1 exit /b 1

:afterinstall
if not exist "packages\shared\dist\index.js" (
	echo Axiom Forge: building @axiom-forge/shared...
	rem tsc's incremental buildinfo can report success without emitting if it
	rem still believes a prior (now-missing) dist\ is current - remove it so
	rem this is always a real, from-scratch compile.
	if exist "packages\shared\tsconfig.tsbuildinfo" del "packages\shared\tsconfig.tsbuildinfo"
	call npm -w @axiom-forge/shared run build
	if errorlevel 1 exit /b 1
)

echo Axiom Forge: starting - the UI will be at http://localhost:5173
call npm run dev -- %*
exit /b %errorlevel%
