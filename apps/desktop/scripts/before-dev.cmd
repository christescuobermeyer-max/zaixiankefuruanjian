@echo off
setlocal

set "SERVER_DEV_COMMAND=pnpm.cmd --filter server dev"
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','%SERVER_DEV_COMMAND%' -WorkingDirectory '%~dp0..\..\..' -WindowStyle Hidden }"
pnpm.cmd web:dev
exit /b %ERRORLEVEL%
