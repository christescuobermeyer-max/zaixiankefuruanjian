@echo off
setlocal
set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if not exist "%VCVARS%" set "VCVARS=D:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
call "%VCVARS%" >nul 2>&1
set /p TAURI_SIGNING_PRIVATE_KEY=<"F:\christescuobermeyer-max\zaixiankefuruanjian\.tauri-keys\zaixiankefu.key"
set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD="
cd /d "%~dp0.."
call pnpm tauri:build
exit /b %ERRORLEVEL%
