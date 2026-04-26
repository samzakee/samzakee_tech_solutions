@echo off
cd /d "%~dp0"
title Diagnostico - 3a CIPMPA
color 0A

echo.
echo ============================================
echo  DIAGNOSTICO DO SISTEMA - 3a CIPMPA
echo ============================================
echo.

echo [1] Verificando Node.js...
node --version
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Node.js nao encontrado no PATH.
    echo Reinicie o computador apos instalar o Node.js.
    pause
    exit /b 1
)
echo OK - Node.js encontrado.
echo.

echo [2] Verificando arquivos necessarios...
if exist server.js (echo OK - server.js encontrado) else (echo ERRO - server.js NAO encontrado - extraia o ZIP novamente)
if exist public\index.html (echo OK - public\index.html encontrado) else (echo ERRO - public\index.html NAO encontrado)
if exist data (echo OK - pasta data encontrada) else (echo AVISO - pasta data sera criada automaticamente)
echo.

echo [3] Verificando porta 3000...
netstat -an | findstr ":3000" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo AVISO - Porta 3000 ja em uso. Tentando liberar...
    for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do taskkill /PID %%a /F >nul 2>nul
    timeout /t 2 >nul
) else (
    echo OK - Porta 3000 disponivel.
)
echo.

echo [4] Testando Node.js basico...
node -e "console.log('Node OK - versao: ' + process.version)"
echo.

echo [5] Iniciando servidor (erros aparecerão abaixo)...
echo ============================================
echo.
node server.js
echo.
echo ============================================
echo SERVIDOR ENCERRADO.
echo Se apareceu algum erro acima, tire uma foto e envie.
pause
