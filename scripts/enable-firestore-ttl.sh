#!/usr/bin/env bash
# Enable Firestore TTL on field expireAt for Potso chats/messages collection groups.
# Prerequisites: gcloud CLI authenticated, correct project selected.
# Usage:
#   export GCP_PROJECT=your-project-id
#   ./scripts/enable-firestore-ttl.sh

set -euo pipefail

PROJECT="${GCP_PROJECT:-${GOOGLE_CLOUD_PROJECT:-}}"
if [[ -z "${PROJECT}" ]]; then
  echo "Set GCP_PROJECT or GOOGLE_CLOUD_PROJECT to your Firebase/GCP project id."
  exit 1
fi

echo "Project: ${PROJECT}"
echo "Enabling TTL on field 'expireAt' for collection groups: chats, messages"

# Collection group TTLs (Firestore native mode)
# Note: flag names can vary slightly by gcloud version; fallback message if command fails.

enable_ttl() {
  local group="$1"
  echo "--- collection group: ${group}"
  if gcloud firestore fields ttls update expireAt \
      --collection-group="${group}" \
      --enable-ttl \
      --project="${PROJECT}" \
      --quiet 2>/dev/null; then
    echo "OK: ${group}"
  else
    echo "CLI update failed for ${group}. Enable manually in Console:"
    echo "  https://console.cloud.google.com/firestore/databases/-default-/ttl?project=${PROJECT}"
    echo "  Field path: expireAt  |  Collection group: ${group}"
  fi
}

enable_ttl chats
enable_ttl messages

echo ""
echo "Done. TTL policies may take time to become Active."
echo "App already stamps expireAt on new chats/messages (RETENTION_*_DAYS)."
