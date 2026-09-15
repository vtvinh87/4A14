#!/bin/sh
set -eu

KEYCHAIN_ACCOUNT="$(id -un)"
KEYCHAIN_SERVICE="hoc-vui-supabase-runtime-password"
runtime_password="$(/usr/bin/security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || true)"

if [ -z "$runtime_password" ]; then
  echo "Học Vui không tìm thấy mật khẩu runtime Supabase trong Keychain." >&2
  exit 1
fi

export HOC_VUI_DATABASE_URL='postgresql://hoc_vui_runtime.tvlpabqkternfvsxqovi@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require'
export HOC_VUI_DB_POOL_MAX='1'
export HOC_VUI_COOKIE_SECURE='false'
export APP_ORIGIN='http://localhost:8888'
export PGPASSWORD="$runtime_password"
export NETLIFY_CLI_TELEMETRY_DISABLED='1'

exec /Users/macbook/.nvm/versions/node/v24.19.0/bin/npx --yes netlify-cli dev --offline
