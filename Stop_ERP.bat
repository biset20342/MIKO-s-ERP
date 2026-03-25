@echo off
echo =========================================
echo       ProjectERP Background Shutdown       
echo =========================================
echo.
echo Stopping background ERP server (Port 3000)...

for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a
)

echo.
echo Server stopped successfully.
echo.
pause
