#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-docker-lxc}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/root/apptramites-dist}"
TUNNEL_CONTAINER="${DEPLOY_TUNNEL_CONTAINER:-prepa-tunnel}"

echo "[1/3] Compilando PWA de produccion (pnpm build)..."
pnpm build

echo "[2/3] Subiendo dist/ a ${HOST}:${REMOTE_DIR}..."
tar -C dist -cf - . | ssh "${HOST}" "mkdir -p '${REMOTE_DIR}' && find '${REMOTE_DIR}' -mindepth 1 -delete && tar -C '${REMOTE_DIR}' -xf -"

echo "[3/3] Verificando contenedor web y URL de Cloudflare..."
URL="$(ssh "${HOST}" "docker ps --filter name=${TUNNEL_CONTAINER} --filter status=running -q | grep -q . || docker start ${TUNNEL_CONTAINER} >/dev/null; docker logs --tail 300 ${TUNNEL_CONTAINER} 2>&1 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -n 1")"

echo ""
echo "Despliegue completado en ${HOST}."
echo "URL local:      http://192.168.1.74"
echo "URL Cloudflare: ${URL:-'(no detectada en logs de prepa-tunnel)'}"
