@echo off
cd /d "%~dp0"
title Teste Node.js
color 0E

echo.
echo ============================================
echo  TESTE RAPIDO DO NODE.JS
echo ============================================
echo.

node --version
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRO: Node.js nao encontrado!
    echo.
    echo Solucoes:
    echo 1. Instale Node.js em https://nodejs.org
    echo 2. REINICIE O COMPUTADOR apos instalar
    echo 3. Execute este arquivo novamente
    echo.
    pause
    exit /b 1
)

echo.
echo Iniciando servidor de teste simples...
echo Se aparecer "Servidor SIMPLES rodando" = Node.js OK!
echo.
node servidor_simples.js
pause
