#!/bin/sh
set -e

LOCK="package-lock.json"
STAMP="node_modules/.deps-stamp"

need_install=0

if [ ! -f "$LOCK" ]; then
  echo "frontend: falta package-lock.json" >&2
  exit 1
fi

if [ ! -d node_modules ] || [ ! -f "$STAMP" ]; then
  need_install=1
elif [ "$LOCK" -nt "$STAMP" ]; then
  need_install=1
fi

# Defensa extra: paquetes críticos que ya rompieron el arranque en el pasado
for pkg in chart.js; do
  if [ ! -d "node_modules/$pkg" ]; then
    need_install=1
    break
  fi
done

if [ "$need_install" = "1" ]; then
  echo "frontend: sincronizando dependencias (npm ci)..."
  npm ci
  mkdir -p node_modules
  touch "$STAMP"
  echo "frontend: dependencias listas."
fi

exec "$@"
