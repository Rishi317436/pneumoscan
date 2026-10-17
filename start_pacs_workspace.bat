@echo off
chcp 65001 >nul
title AI Chest Radiology Analysis Workspace - Launcher

echo ======================================================================
echo    AI CHEST RADIOLOGY ANALYSIS & PACS WORKSPACE (DUAL-ENGINE)
echo ======================================================================
echo.
echo [1/4] Checking MongoDB Service...
sc query MongoDB | findstr /I "STATE.*RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Local MongoDB service does not appear to be running.
    echo     Attempting to start MongoDB service...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Warning: Could not start MongoDB service automatically.
        echo     Ensure mongod is running on mongodb://localhost:27017/
    ) else (
        echo [+] MongoDB service started successfully.
    )
) else (
    echo [+] MongoDB is active and running.
)
echo.

echo [2/4] Starting Node.js + Express Backend API (Port 5000)...
start "Pneumonia-Backend-API (Port 5000)" cmd /k "cd /d "%~dp0backend" && title Backend API - Port 5000 && npm start"

echo [+] Waiting 4 seconds for backend to initialize...
timeout /t 4 /nobreak >nul
echo.

echo [3/4] Starting React + Vite PACS Frontend (Port 5173)...
start "Pneumonia-Frontend-UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && title React PACS Frontend - Port 5173 && npm run dev"

echo [+] Waiting 3 seconds for Vite server to warm up...
timeout /t 3 /nobreak >nul
echo.

echo [4/4] Launching PACS Workspace in Default Browser...
start http://localhost:5173/workspace
echo.

echo ======================================================================
echo    SYSTEM LAUNCH COMPLETE
echo ======================================================================
echo  - Frontend Workspace:  http://localhost:5173/workspace
echo  - Backend REST API:    http://localhost:5000/api/health
echo  - ML Inference Engine: WSL2 Python 3.12 (DenseNet-121 + Deep U-Net)
echo.
echo  Default Login Credentials:
echo   * Admin:     admin@radiology.local     /  password123
echo   * Clinician: clinician@radiology.local /  password123
echo.
echo  Keep the two terminal windows open while using the application.
echo ======================================================================
echo.
pause
