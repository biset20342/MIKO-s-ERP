@echo off
if "%~1"=="hidden" goto :run

set "VBS_PATH=%temp%\hide_erp.vbs"
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.Run """" ^& WScript.Arguments(0) ^& """ hidden", 0, False >> "%VBS_PATH%"
wscript "%VBS_PATH%" "%~dpnx0"
exit

:run
start "" "http://localhost:3000"
node server.js
