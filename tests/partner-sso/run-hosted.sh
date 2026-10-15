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

WORK="$(mktemp -d "$RUNNER_TEMP/partner-sso.XXXXXX")"
PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do
    sudo kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  rm -rf "$WORK"
}
trap cleanup EXIT
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
for value in "$JWT_SECRET" "$ENCRYPTION_KEY" "$PARTNER_SAAS_OAUTH_CLIENT_SECRET" "$PARTNER_SAAS_EDGE_TOKEN" "$PARTNER_SAAS_CSRF_SECRET"; do
  echo "::add-mask::$value"
done

openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -keyout "$WORK/ca.key" -out "$WORK/ca.crt" -subj "/CN=Partner SSO disposable CI CA" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -keyout "$WORK/tls.key" -out "$WORK/tls.csr" \
  -subj "/CN=central.test" 2>/dev/null
printf 'subjectAltName=DNS:central.test,DNS:product-a.test,DNS:product-b.test\nextendedKeyUsage=serverAuth\n' > "$WORK/tls.ext"
openssl x509 -req -in "$WORK/tls.csr" -CA "$WORK/ca.crt" -CAkey "$WORK/ca.key" \
  -CAcreateserial -out "$WORK/tls.crt" -days 1 -extfile "$WORK/tls.ext" 2>/dev/null
sudo cp "$WORK/ca.crt" /usr/local/share/ca-certificates/partner-sso-ci.crt
sudo update-ca-certificates > /dev/null
mkdir -p "$HOME/.pki/nssdb"
if [[ ! -f "$HOME/.pki/nssdb/cert9.db" ]]; then
  certutil -N -d "sql:$HOME/.pki/nssdb" --empty-password
fi
certutil -A -d "sql:$HOME/.pki/nssdb" -n partner-sso-ci -t "C,," -i "$WORK/ca.crt"
echo '127.0.0.1 central.test product-a.test product-b.test' | sudo tee -a /etc/hosts > /dev/null
export NODE_EXTRA_CA_CERTS="$WORK/ca.crt"
export NO_PROXY=localhost,127.0.0.1,central.test,product-a.test,product-b.test
export no_proxy="$NO_PROXY"
export NODE_PATH="$BROWSER_TOOLS/node_modules"

# Build before denying runtime egress; never reuse a build with different flags.
npm run build
(cd "$BACKEND" && bash mvnw -B -q -DskipTests package)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$WORK/signing.key" 2>/dev/null
openssl pkey -in "$WORK/signing.key" -pubout -out "$WORK/signing.pub"

# The isolated hosted runner loses egress after all package/build downloads finish.
sudo iptables -I OUTPUT 1 -o lo -j ACCEPT
sudo iptables -I OUTPUT 2 -j REJECT
sudo ip6tables -I OUTPUT 1 -o lo -j ACCEPT
sudo ip6tables -I OUTPUT 2 -j REJECT
sudo useradd --system --no-create-home partner-sso-ci
sudo -u partner-sso-ci env -i PATH="$PATH" JAVA_HOME="$JAVA_HOME" \
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
  java -jar "$BACKEND/target/factory1-backend-0.0.1-SNAPSHOT.jar" \
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
npm start -- --hostname 127.0.0.1 > "$WORK/frontend.log" 2>&1 &
PIDS+=("$!")

wait_for() {
  for attempt in $(seq 1 120); do
    if curl --noproxy '*' --silent --fail "$1" > /dev/null; then return; fi
    sleep 1
  done
  echo "Service did not become ready: $1 (runtime logs intentionally not uploaded)"
  exit 1
}
wait_for https://central.test/actuator/health
for attempt in $(seq 1 120); do
  if curl --noproxy '*' --silent --fail -H 'Host: localhost:3000' http://127.0.0.1:3000/login > /dev/null; then break; fi
  sleep 1
done

(cd "$BACKEND" && PARTNER_SSO_E2E_FIXTURES=true \
  PARTNER_SSO_E2E_JDBC_URL=jdbc:postgresql://127.0.0.1:5432/factory1_e2e \
  PARTNER_SSO_E2E_DB_USER=postgres PARTNER_SSO_E2E_DB_PASSWORD=disposable-e2e-only \
  bash mvnw -B -q -Dtest=PartnerSsoE2eFixtureSeederTest test)
wait_for https://product-a.test
wait_for https://product-b.test
node "$BROWSER_TOOLS/node_modules/@playwright/test/cli.js" test --config tests/partner-sso/playwright.config.cjs
printf 'Backend SHA: `%s`\nFrontend SHA: `%s`\nReal Chromium / trusted HTTPS / disposable PostgreSQL 14.22; fixture readiness is not provisioning evidence.\n' \
  "$EXPECTED_BACKEND" "$(git rev-parse HEAD)" >> "$GITHUB_STEP_SUMMARY"
