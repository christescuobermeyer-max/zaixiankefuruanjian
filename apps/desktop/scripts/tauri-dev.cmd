@echo off
setlocal

set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
if exist "%VCVARS%" goto run

set "VCVARS=D:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if exist "%VCVARS%" goto run

echo Visual Studio 2022 vcvars64.bat not found; falling back to current shell environment.
pnpm.cmd dev:tauri
exit /b %ERRORLEVEL%

:run
call "%VCVARS%"
pnpm.cmd dev:tauri
exit /b %ERRORLEVEL%
