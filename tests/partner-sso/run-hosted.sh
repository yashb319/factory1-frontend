#!/usr/bin/env bash
set -euo pipefail

[[ "${GITHUB_ACTIONS:-}" == true ]] || { echo "This harness runs only on disposable GitHub-hosted Linux runners."; exit 1; }
[[ "$(uname)" == Linux ]] || exit 1
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$(realpath "${1:?Pass the pinned backend checkout directory}")"
EXPECTED_BACKEND=c9bdbda834fadace0cf94e2a6850edea0bea0d87
[[ "$(git -C "$BACKEND" rev-parse HEAD)" == "$EXPECTED_BACKEND" ]] || { echo "Backend SHA mismatch"; exit 1; }
: "${BROWSER_TOOLS:?Install pinned Playwright tools first}"
: "${RUNNER_TEMP:?}"
: "${PLAYWRIGHT_BROWSERS_PATH:?Set the same shared browser path used by Playwright install}"
source "$ROOT/tests/partner-sso/filesystem.sh"

WORK="$(mktemp -d "$RUNNER_TEMP/partner-sso.XXXXXX")"
TEST_HOME="$WORK/browser-home"
PIDS=()
BACKEND_UID=""
APP_UID=""
cleanup() {
  local status=$?
  trap - EXIT
  set +e
  for pid in "${PIDS[@]}"; do
    sudo kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  if (( status != 0 )); then
    for log in backend frontend proxy; do
      if [[ -f "$WORK/$log.log" ]]; then
        echo "Sanitized $log diagnostics (last 80 lines):"
        tail -n 80 "$WORK/$log.log" | node "$ROOT/tests/partner-sso/sanitize-logs.cjs"
      fi
    done
  fi
  if [[ -n "$BACKEND_UID" ]]; then
    sudo iptables -D OUTPUT -m owner --uid-owner "$BACKEND_UID" -d 127.0.0.0/8 -j ACCEPT 2>/dev/null || true
    sudo iptables -D OUTPUT -m owner --uid-owner "$BACKEND_UID" -j REJECT 2>/dev/null || true
    sudo ip6tables -D OUTPUT -m owner --uid-owner "$BACKEND_UID" -j REJECT 2>/dev/null || true
  fi
  if [[ -n "$APP_UID" ]]; then
    sudo iptables -D OUTPUT -m owner --uid-owner "$APP_UID" -d 127.0.0.0/8 -j ACCEPT 2>/dev/null || true
    sudo iptables -D OUTPUT -m owner --uid-owner "$APP_UID" -j REJECT 2>/dev/null || true
    sudo ip6tables -D OUTPUT -m owner --uid-owner "$APP_UID" -j REJECT 2>/dev/null || true
  fi
  sudo chown -R "$(id -u):$(id -g)" "$ROOT/.next" 2>/dev/null || true
  restore_test_traversal
  sudo userdel --remove partner-sso-browser 2>/dev/null || true
  sudo userdel --remove partner-sso-ci 2>/dev/null || true
  sudo rm -f /usr/local/share/ca-certificates/partner-sso-ci.crt
  sudo update-ca-certificates >/dev/null 2>&1 || true
  sudo sed -i '/^127\.0\.0\.1 central\.test product-a\.test product-b\.test$/d' /etc/hosts
  sudo rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
cd "$ROOT"

export NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_PARTNER_SAAS_V2_ENABLED=true
export PARTNER_SAAS_HOST_BOUNDARY_ENABLED=true
export PARTNER_SAAS_DIRECT_HOSTS=localhost:3000,127.0.0.1:3000
export PARTNER_SAAS_STOREFRONT_ENABLED=true
export PARTNER_SAAS_BACKEND_ORIGIN=https://central.test
export PARTNER_SAAS_OAUTH_CLIENT_ID=partner-sso-browser-e2e
export PARTNER_SAAS_OAUTH_CLIENT_SECRET="$(openssl rand -hex 32)"
export PARTNER_SAAS_EDGE_TOKEN="$(openssl rand -hex 32)"
export PARTNER_SAAS_CSRF_SECRET="$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n')"
JWT_SECRET="$(openssl rand -hex 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
TRUSTSTORE_PASSWORD="$(openssl rand -hex 24)"
for value in "$JWT_SECRET" "$ENCRYPTION_KEY" "$PARTNER_SAAS_OAUTH_CLIENT_SECRET" "$PARTNER_SAAS_EDGE_TOKEN" "$PARTNER_SAAS_CSRF_SECRET" "$TRUSTSTORE_PASSWORD"; do
  echo "::add-mask::$value"
done

openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -keyout "$WORK/ca.key" -out "$WORK/ca.crt" -subj "/CN=Partner SSO disposable CI CA" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout "$WORK/tls.key" -out "$WORK/tls.csr" \
  -subj "/CN=central.test" 2>/dev/null
printf 'subjectAltName=DNS:central.test,DNS:product-a.test,DNS:product-b.test\nextendedKeyUsage=serverAuth\n' > "$WORK/tls.ext"
openssl x509 -req -in "$WORK/tls.csr" -CA "$WORK/ca.crt" -CAkey "$WORK/ca.key" \
  -CAcreateserial -out "$WORK/tls.crt" -days 1 -extfile "$WORK/tls.ext" 2>/dev/null
keytool -importcert -noprompt -trustcacerts -alias partner-sso-ci \
  -file "$WORK/ca.crt" -keystore "$WORK/java-truststore.p12" \
  -storetype PKCS12 -storepass "$TRUSTSTORE_PASSWORD" >/dev/null
sudo cp "$WORK/ca.crt" /usr/local/share/ca-certificates/partner-sso-ci.crt
sudo update-ca-certificates > /dev/null
echo '127.0.0.1 central.test product-a.test product-b.test' | sudo tee -a /etc/hosts > /dev/null
export NODE_EXTRA_CA_CERTS="$WORK/ca.crt"
export NO_PROXY=localhost,127.0.0.1,central.test,product-a.test,product-b.test
export no_proxy="$NO_PROXY"
export NODE_PATH="$BROWSER_TOOLS/node_modules"

# Build before denying runtime egress; never reuse a build with different flags.
npm run build
(cd "$BACKEND" && bash mvnw -B -q -DskipTests package)
(cd "$BACKEND" && bash mvnw -B -q -Dtest=PartnerSsoE2eFixtureSeederTest -DskipTests test)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$WORK/signing.key" 2>/dev/null
openssl pkey -in "$WORK/signing.key" -pubout -out "$WORK/signing.pub"

# Only application identities lose egress; the Actions runner and private CI control plane remain connected.
sudo useradd --system --no-create-home partner-sso-ci
sudo useradd --system --create-home --home-dir "$TEST_HOME" --shell /usr/sbin/nologin partner-sso-browser
chmod 755 "$WORK"
grant_test_traversal "$ROOT" "$BACKEND" "$BROWSER_TOOLS" "$PLAYWRIGHT_BROWSERS_PATH" "$RUNNER_TEMP" "$JAVA_HOME" "$(command -v node)" "$(command -v npm)"
BACKEND_UID="$(id -u partner-sso-ci)"
APP_UID="$(id -u partner-sso-browser)"
sudo install -d -o partner-sso-ci -g partner-sso-ci -m 700 "$WORK/backend-home" "$WORK/backend-tmp"
mkdir -p "$WORK/playwright-output"
sudo -u partner-sso-browser mkdir -p "$TEST_HOME/.pki/nssdb" "$TEST_HOME/cache" "$TEST_HOME/config" "$TEST_HOME/data" "$TEST_HOME/npm-cache" "$TEST_HOME/tmp"
sudo -u partner-sso-browser certutil -N -d "sql:$TEST_HOME/.pki/nssdb" --empty-password
sudo -u partner-sso-browser certutil -A -d "sql:$TEST_HOME/.pki/nssdb" -n partner-sso-ci -t "C,," -i "$WORK/ca.crt"
sudo chown -R partner-sso-browser:partner-sso-browser "$ROOT/.next" "$WORK/playwright-output"
sudo chmod -R a+rX "$BROWSER_TOOLS" "$PLAYWRIGHT_BROWSERS_PATH"
chmod 644 "$WORK/ca.crt" "$WORK/java-truststore.p12"
require_access() {
  local user=$1 permission=$2 path=$3
  if ! sudo -u "$user" test "$permission" "$path"; then
    echo "Runtime filesystem access check failed: user=$user permission=$permission path=$path" >&2
    exit 1
  fi
}
require_access partner-sso-ci -r "$BACKEND/target/factory1-backend-0.0.1-SNAPSHOT.jar"
require_access partner-sso-ci -r "$WORK/java-truststore.p12"
require_access partner-sso-ci -x "$JAVA_HOME/bin/java"
require_access partner-sso-ci -w "$WORK/backend-home"
require_access partner-sso-ci -w "$WORK/backend-tmp"
for path in "$ROOT/package.json" "$BROWSER_TOOLS/node_modules/@playwright/test/cli.js"; do
  require_access partner-sso-browser -r "$path"
done
for path in "$ROOT/node_modules/.bin/next" "$BROWSER_TOOLS" "$PLAYWRIGHT_BROWSERS_PATH"; do
  require_access partner-sso-browser -x "$path"
done
require_access partner-sso-browser -w "$TEST_HOME/tmp"
for key_line in "$WORK/signing.key" "$WORK/signing.pub"; do
  while IFS= read -r line; do echo "::add-mask::$line"; done < "$key_line"
done
sudo iptables -I OUTPUT 1 -m owner --uid-owner "$BACKEND_UID" -d 127.0.0.0/8 -j ACCEPT
sudo iptables -I OUTPUT 2 -m owner --uid-owner "$BACKEND_UID" -j REJECT
sudo iptables -I OUTPUT 3 -m owner --uid-owner "$APP_UID" -d 127.0.0.0/8 -j ACCEPT
sudo iptables -I OUTPUT 4 -m owner --uid-owner "$APP_UID" -j REJECT
sudo ip6tables -I OUTPUT 1 -m owner --uid-owner "$BACKEND_UID" -j REJECT
sudo ip6tables -I OUTPUT 2 -m owner --uid-owner "$APP_UID" -j REJECT
sudo -u partner-sso-ci env -i PATH="$PATH" JAVA_HOME="$JAVA_HOME" HOME="$WORK/backend-home" TMPDIR="$WORK/backend-tmp" \
  SPRING_PROFILES_ACTIVE=prod PORT=8080 \
  DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/factory1_e2e \
  DATABASE_USERNAME=postgres DATABASE_PASSWORD=disposable-e2e-only \
  JWT_SECRET="$JWT_SECRET" JWT_EXPIRATION=3600000 \
  PARTNER_SSO_ENABLED=true PARTNER_SSO_ISSUER_URI=https://central.test \
  PARTNER_SSO_CLIENT_ID="$PARTNER_SAAS_OAUTH_CLIENT_ID" \
  PARTNER_SSO_CLIENT_SECRET="$PARTNER_SAAS_OAUTH_CLIENT_SECRET" \
  PARTNER_SSO_ENCRYPTION_KEY="$ENCRYPTION_KEY" PARTNER_SSO_SIGNING_KEY_ID=e2e-key \
  PARTNER_SSO_SIGNING_PRIVATE_KEY_PEM="$(cat "$WORK/signing.key")" \
  PARTNER_SSO_SIGNING_PUBLIC_KEY_PEM="$(cat "$WORK/signing.pub")" \
  PARTNER_SSO_REDIRECT_URIS=https://product-a.test/auth/callback,https://product-b.test/auth/callback \
  FACTORY1_PARTNER_SAAS_STOREFRONT_ENABLED=true \
  FACTORY1_PARTNER_SAAS_EDGE_TOKEN="$PARTNER_SAAS_EDGE_TOKEN" \
  FACTORY1_PARTNER_SAAS_TRUSTED_PROXY_ADDRESSES=127.0.0.1 \
  SANDBOX_DEMO_PROVISION_ON_STARTUP=false PRODUCTION_QUANTITY_FLOW_ENABLED=false \
  FACTORY1_HEALTH_CHECK_EMAIL_ENABLED=false FACTORY1_HEALTH_CHECK_DIGEST_ENABLED=false \
  MAIL_HOST=127.0.0.1 MAIL_PORT=9 MAIL_USERNAME= MAIL_PASSWORD= MAIL_FROM=ci@example.test \
  MAIL_SMTP_AUTH=false MAIL_SMTP_STARTTLS_ENABLE=false LOCAL_OTP_BYPASS_CODE= \
  java -Djavax.net.ssl.trustStore="$WORK/java-truststore.p12" \
  -Djava.io.tmpdir="$WORK/backend-tmp" -Duser.home="$WORK/backend-home" \
  -Djavax.net.ssl.trustStoreType=PKCS12 \
  -Djavax.net.ssl.trustStorePassword="$TRUSTSTORE_PASSWORD" \
  -jar "$BACKEND/target/factory1-backend-0.0.1-SNAPSHOT.jar" \
  --server.address=127.0.0.1 --server.forward-headers-strategy=framework \
  --factory1.notifications.operational-digest.enabled=false \
  --factory1.notifications.renewal.cron=- \
  --factory1.notifications.production.deadline-breach.enabled=false \
  --factory1.sandbox.demo.refresh-cron=- \
  --factory1.sandbox.cleanup.cron=- \
  --factory1.profit-recommendations.enqueue-cron=- \
  --factory1.deletion.cleanup-delay-ms=3600000 \
  --factory1.profit-recommendations.delivery-ms=3600000 \
  --factory1.profit-recommendations.dispatch-ms=3600000 \
  > "$WORK/backend.log" 2>&1 &
PIDS+=("$!")
sudo "$(command -v node)" "$ROOT/tests/partner-sso/https-proxy.cjs" "$WORK/tls.crt" "$WORK/tls.key" \
  > "$WORK/proxy.log" 2>&1 &
PIDS+=("$!")
sudo -u partner-sso-browser env -i PATH="$PATH" HOME="$TEST_HOME" \
  XDG_CACHE_HOME="$TEST_HOME/cache" XDG_CONFIG_HOME="$TEST_HOME/config" XDG_DATA_HOME="$TEST_HOME/data" \
  npm_config_cache="$TEST_HOME/npm-cache" TMPDIR="$TEST_HOME/tmp" \
  NODE_EXTRA_CA_CERTS="$WORK/ca.crt" NODE_PATH="$BROWSER_TOOLS/node_modules" \
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
  NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_PARTNER_SAAS_V2_ENABLED=true \
  PARTNER_SAAS_HOST_BOUNDARY_ENABLED=true PARTNER_SAAS_DIRECT_HOSTS=localhost:3000,127.0.0.1:3000 \
  PARTNER_SAAS_STOREFRONT_ENABLED=true PARTNER_SAAS_BACKEND_ORIGIN=https://central.test \
  PARTNER_SAAS_OAUTH_CLIENT_ID="$PARTNER_SAAS_OAUTH_CLIENT_ID" \
  PARTNER_SAAS_OAUTH_CLIENT_SECRET="$PARTNER_SAAS_OAUTH_CLIENT_SECRET" \
  PARTNER_SAAS_EDGE_TOKEN="$PARTNER_SAAS_EDGE_TOKEN" \
  PARTNER_SAAS_CSRF_SECRET="$PARTNER_SAAS_CSRF_SECRET" \
  npm start -- --hostname 127.0.0.1 > "$WORK/frontend.log" 2>&1 &
PIDS+=("$!")

wait_for() {
  for attempt in $(seq 1 120); do
    if curl --noproxy '*' --silent --fail "$1" > /dev/null; then return; fi
    sleep 1
  done
  echo "Service did not become ready: $1 (sanitized diagnostics follow during cleanup)"
  exit 1
}
wait_for https://central.test/actuator/health
FRONTEND_READY=false
for attempt in $(seq 1 120); do
  if curl --noproxy '*' --silent --fail -H 'Host: localhost:3000' http://127.0.0.1:3000/login > /dev/null; then
    FRONTEND_READY=true
    break
  fi
  sleep 1
done
if [[ "$FRONTEND_READY" != true ]]; then
  echo "Frontend did not become ready (sanitized diagnostics follow during cleanup)"
  exit 1
fi

(cd "$BACKEND" && PARTNER_SSO_E2E_FIXTURES=true \
  PARTNER_SSO_E2E_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/factory1_e2e \
  PARTNER_SSO_E2E_DB_USER=postgres PARTNER_SSO_E2E_DB_PASSWORD=disposable-e2e-only \
  bash mvnw -B -q -o -Dtest=PartnerSsoE2eFixtureSeederTest test)
wait_for https://product-a.test
wait_for https://product-b.test
sudo -u partner-sso-browser env -i PATH="$PATH" HOME="$TEST_HOME" \
  XDG_CACHE_HOME="$TEST_HOME/cache" XDG_CONFIG_HOME="$TEST_HOME/config" XDG_DATA_HOME="$TEST_HOME/data" \
  npm_config_cache="$TEST_HOME/npm-cache" TMPDIR="$TEST_HOME/tmp" \
  NODE_EXTRA_CA_CERTS="$WORK/ca.crt" NODE_PATH="$BROWSER_TOOLS/node_modules" \
  PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" \
  PLAYWRIGHT_OUTPUT_DIR="$WORK/playwright-output" GITHUB_ACTIONS=true \
  node "$BROWSER_TOOLS/node_modules/@playwright/test/cli.js" test --config tests/partner-sso/playwright.config.cjs
printf 'Backend SHA: `%s`\nFrontend SHA: `%s`\nReal Chromium / trusted HTTPS / disposable PostgreSQL 14.22; fixture readiness is not provisioning evidence.\n' \
  "$EXPECTED_BACKEND" "$(git rev-parse HEAD)" >> "$GITHUB_STEP_SUMMARY"
