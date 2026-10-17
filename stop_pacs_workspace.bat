@echo off
chcp 65001 >nul
title Stopping AI Radiology Workspace Services...

echo ======================================================================
echo    STOPPING AI RADIOLOGY WORKSPACE SERVICES (PORTS 5000 & 5173)
echo ======================================================================
echo.

echo Terminating processes on Port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo  - Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Terminating processes on Port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo  - Killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [+] All workspace services have been stopped.
echo ======================================================================
echo.
pause
