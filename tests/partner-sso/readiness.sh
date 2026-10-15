#!/usr/bin/env bash

report_health_response() {
  local url=$1 body status curl_status
  body="$WORK/health-response.json"
  : > "$body"
  curl_status=0
  status="$(curl --noproxy '*' --cacert "$WORK/ca.crt" --silent --show-error \
    --max-time 10 --output "$body" --write-out '%{http_code}' "$url")" || curl_status=$?
  echo "Health diagnostics: $url HTTP ${status:-000} curl exit $curl_status"
  if [[ -s "$body" ]]; then
    node "$ROOT/tests/partner-sso/sanitize-logs.cjs" < "$body"
  elif [[ "$url" == https://central.example.com/actuator/health ]]; then
    echo "Health response body was empty; checking readiness health group"
    report_health_response https://central.example.com/actuator/health/readiness
  fi
}
