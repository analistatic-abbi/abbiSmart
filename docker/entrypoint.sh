#!/bin/sh
set -e

DB_HOST="${DB_HOST:-mariadb}"
DB_PORT="${DB_PORT:-3306}"

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."

until node -e "
const net = require('net');
const host = process.env.DB_HOST || 'mariadb';
const port = Number(process.env.DB_PORT || 3306);
const socket = net.createConnection({ host, port });
socket.on('connect', () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  sleep 2
done

echo "Database is ready."
exec "$@"
