@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 한 칸만 옮겼는데 - 방명록 서버
node server.mjs
pause
