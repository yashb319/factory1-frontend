#!/usr/bin/env bash
set -euo pipefail

[[ "${GITHUB_ACTIONS:-}" == true ]] || { echo "Hosted-only Next authority smoke"; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d "${RUNNER_TEMP:?}/partner-sso-smoke.XXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  set +e
  if [[ -f "$WORK/next.config.original.mjs" ]]; then
    cp "$WORK/next.config.original.mjs" "$ROOT/next.config.mjs" || echo "Failed to restore test build config" >&2
    rm -f "$ROOT/src/app/api/partner-e2e-authority/route.ts"
    rmdir "$ROOT/src/app/api/partner-e2e-authority" || true
  fi
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cd "$ROOT"
[[ ! -e src/app/api/partner-e2e-authority ]] || exit 1
node tests/partner-sso/build-config.cjs "$ROOT/next.config.mjs" "$WORK/next.config.original.mjs"
npm run build
for host in product-a.example.com product-b.example.com; do
  TEST_FRONTEND_HOST="$host" NODE_ENV=production node --test tests/partner-sso/frontend-server.test.cjs
done
