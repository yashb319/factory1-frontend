#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/filesystem.sh"
FIXTURE="$(mktemp -d /tmp/partner-sso-filesystem.XXXXXX)"
cleanup() {
  local status=$?
  trap - EXIT
  restore_test_traversal
  sudo rm -rf "$FIXTURE"
  exit "$status"
}
trap cleanup EXIT

mkdir -p "$FIXTURE/private/workspace/tools/browsers"
chmod 750 "$FIXTURE"
chmod 700 "$FIXTURE/private"
printf 'fixture\n' > "$FIXTURE/private/workspace/package.json"
if sudo -u nobody test -r "$FIXTURE/private/workspace/package.json"; then
  echo "Expected the restricted ancestor to reject a different UID" >&2
  exit 1
fi
grant_test_traversal "$FIXTURE/private/workspace" "$FIXTURE/private/workspace/tools" "$FIXTURE/private/workspace/tools/browsers"
[[ "$(stat -c %a "$FIXTURE")" == 751 ]]
[[ "$(stat -c %a "$FIXTURE/private")" == 701 ]]
sudo -u nobody test -r "$FIXTURE/private/workspace/package.json"
sudo -u nobody test -x "$FIXTURE/private/workspace/tools/browsers"
restore_test_traversal
[[ "$(stat -c %a "$FIXTURE")" == 750 ]]
[[ "$(stat -c %a "$FIXTURE/private")" == 700 ]]
if sudo -u nobody test -r "$FIXTURE/private/workspace/package.json"; then
  echo "Ancestor permissions were not restored" >&2
  exit 1
fi
set +e
bash -c '
  set -euo pipefail
  source "$1"
  trap '\''status=$?; restore_test_traversal; exit "$status"'\'' EXIT
  grant_test_traversal "$2"
  exit 23
' _ "$(realpath "$(dirname "$0")/filesystem.sh")" "$FIXTURE/private/workspace"
STATUS=$?
set -e
[[ "$STATUS" == 23 ]]
[[ "$(stat -c %a "$FIXTURE")" == 750 ]]
[[ "$(stat -c %a "$FIXTURE/private")" == 700 ]]
echo "Cross-UID ancestor traversal and exact mode restoration passed"
