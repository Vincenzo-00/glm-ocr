@echo off
setlocal enabledelayedexpansion

:: Forza la directory corrente a quella dello script
cd /d "%~dp0"

echo Pulizia porte 8000 e 4201...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4201') do taskkill /F /PID %%a 2>nul

echo.
echo Avvio GLM-OCR WebApp...
echo Directory: %CD%

:: Avvio Backend
start "Backend FastAPI" cmd /k "cd /d backend && venv\Scripts\python.exe main.py"

:: Avvio Frontend
start "Frontend Angular" cmd /k "cd /d frontend && npm start -- --port 4201"

echo.
echo ==========================================
echo Finestre di avvio aperte.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:4201
echo ==========================================
pause
