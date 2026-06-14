#!/bin/sh
set -e

SESSIONS_DIR="${SESSIONS_DIR:-/app/sessions}"

mkdir -p "$SESSIONS_DIR" /app/.next/cache
chown -R nextjs:nodejs "$SESSIONS_DIR" /app/.next/cache 2>/dev/null || true

exec su-exec nextjs "$@"
