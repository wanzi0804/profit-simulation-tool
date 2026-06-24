@echo off
setlocal
cd /d "%~dp0"
if "%PORT%"=="" set PORT=4177
echo Starting profit simulation tool on http://localhost:%PORT%
node server.js
