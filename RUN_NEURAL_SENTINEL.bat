@echo off
setlocal enabledelayedexpansion

REM Auto-run Neual Research Sentinel

REM Start Frontend (Vite) - port 5173
start "frontend" /b cmd /c "cd frontend && npm install && npm run dev -- --host 127.0.0.1 --port 5173" 

REM Start Backend (FastAPI) - port 8000
start "backend" /b cmd /c "cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000" 

echo.
echo Waiting for servers...

REM Wait briefly
ping 127.0.0.1 -n 4 >nul

echo.
echo Frontend should be at: http://127.0.0.1:5173/
echo Backend should be at:  http://127.0.0.1:8000/

REM Keep batch alive
:loop
timeout /t 60 >nul
goto loop

