#!/bin/bash
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   SISTEMA DE ESCALA — 3a CIPMPA  v2.0               ║"
echo "  ║   Login admin: samuel.ribeiro / admin123             ║"
echo "  ║   Login DEV:   dev / dev@3cipmpa                     ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""
if ! command -v node &> /dev/null; then
    echo "  [ERRO] Node.js nao encontrado. Instale em: https://nodejs.org"
    exit 1
fi
echo "  Iniciando em http://localhost:3000 ..."
node "$(dirname "$0")/server.js"
