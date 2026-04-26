@echo off
cd /d "%~dp0"
title 3a CIPMPA - Sistema de Escala v7.1

echo.
echo  ================================================
echo   3a CIPMPA - Sistema de Escala v7.1
echo   Login: 883039 / Senha: 883039
echo  ================================================
echo.

:: Encerrar TODOS os processos node.exe
echo Encerrando processos Node.js anteriores...
taskkill /IM node.exe /F >nul 2>nul
timeout /t 2 >nul

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERRO] Node.js nao encontrado!
    echo  Baixe em: https://nodejs.org versao LTS
    pause
    exit /b 1
)

echo  Iniciando em http://localhost:3000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4"') do echo  Rede: http://%%a:3000
echo  MANTENHA ESTA JANELA ABERTA enquanto usar o sistema.
echo  Para encerrar: feche esta janela.
echo.
node server.js
pause
