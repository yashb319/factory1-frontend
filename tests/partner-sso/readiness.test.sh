#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$ROOT/tests/partner-sso/readiness.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

curl() {
  local body="" url=""
  while (( $# > 0 )); do
    case "$1" in
      --output) body=$2; shift 2 ;;
      https://*) url=$1; shift ;;
      *) shift ;;
    esac
  done
  if [[ "$url" == https://central.test/actuator/health ]]; then
    printf '%s' "${HEALTH_BODY:-}" > "$body"
    printf '503'
  else
    printf '{"status":"OUT_OF_SERVICE"}' > "$body"
    printf '503'
  fi
}

HEALTH_BODY='{"status":"DOWN","components":{"mail":{"status":"DOWN"}}}'
OUTPUT="$(report_health_response https://central.test/actuator/health)"
[[ "$OUTPUT" == *"HTTP 503 curl exit 0"* ]]
[[ "$OUTPUT" == *'"mail":{"status":"DOWN"}'* ]]
[[ "$OUTPUT" != *"checking readiness health group"* ]]
HEALTH_BODY=""
OUTPUT="$(report_health_response https://central.test/actuator/health)"
[[ "$OUTPUT" == *"Health response body was empty"* ]]
[[ "$OUTPUT" == *"/actuator/health/readiness HTTP 503"* ]]
[[ "$OUTPUT" == *'"OUT_OF_SERVICE"'* ]]
echo "Health HTTP/body diagnostics and empty-body readiness fallback passed"
