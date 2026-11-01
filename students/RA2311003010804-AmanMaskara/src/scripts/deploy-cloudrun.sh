#!/usr/bin/env bash
# Deploy FairShift to Google Cloud Run (asia-south1, next to MongoDB Atlas Mumbai).
#
# Usage:
#   MONGODB_URI='mongodb+srv://…' bash scripts/deploy-cloudrun.sh <project-id> [gemini-api-key]
#
# Secrets go to Secret Manager (never into the repo or the image). Re-running is safe:
# existing secrets get a new version, the service gets a new revision.
set -euo pipefail

PROJECT="${1:?usage: MONGODB_URI=... bash scripts/deploy-cloudrun.sh <project-id> [gemini-api-key]}"
GEMINI_KEY="${2:-}"
REGION="asia-south1"
SERVICE="fairshift"
: "${MONGODB_URI:?set MONGODB_URI in the environment}"

GCLOUD="${GCLOUD:-gcloud}"
command -v "$GCLOUD" >/dev/null 2>&1 || GCLOUD="$LOCALAPPDATA/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd"
g() { "$GCLOUD" --quiet --project "$PROJECT" "$@"; }

echo "==> Project $PROJECT"
"$GCLOUD" config set project "$PROJECT" >/dev/null

echo "==> Checking billing (Cloud Run requires it)"
if [ "$("$GCLOUD" billing projects describe "$PROJECT" --format='value(billingEnabled)' 2>/dev/null)" != "True" ]; then
  echo "!! Billing is not enabled for $PROJECT."
  echo "   Enable it at https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT and re-run."
  exit 1
fi

echo "==> Enabling APIs"
g services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudscheduler.googleapis.com

random_secret() { node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"; }

put_secret() { # name value
  if g secrets describe "$1" >/dev/null 2>&1; then
    printf '%s' "$2" | g secrets versions add "$1" --data-file=- >/dev/null
  else
    printf '%s' "$2" | g secrets create "$1" --replication-policy=automatic --data-file=- >/dev/null
  fi
  echo "    secret $1 ✓"
}

ensure_random_secret() { # keep an existing random secret so sessions survive redeploys
  if g secrets describe "$1" >/dev/null 2>&1; then echo "    secret $1 ✓ (kept)"; else put_secret "$1" "$(random_secret)"; fi
}

echo "==> Secrets"
put_secret fairshift-mongodb-uri "$MONGODB_URI"
ensure_random_secret fairshift-session-secret
ensure_random_secret fairshift-feedback-secret
ensure_random_secret fairshift-qr-secret
ensure_random_secret fairshift-passport-secret
ensure_random_secret fairshift-cron-secret
ensure_random_secret fairshift-bank-key
SECRETS="MONGODB_URI=fairshift-mongodb-uri:latest,SESSION_SECRET=fairshift-session-secret:latest,FEEDBACK_HMAC_SECRET=fairshift-feedback-secret:latest,QR_SIGNING_SECRET=fairshift-qr-secret:latest,PASSPORT_SECRET=fairshift-passport-secret:latest,CRON_SECRET=fairshift-cron-secret:latest,BANK_ENCRYPTION_KEY=fairshift-bank-key:latest"
if [ -n "$GEMINI_KEY" ]; then
  put_secret fairshift-gemini-key "$GEMINI_KEY"
  SECRETS="$SECRETS,GEMINI_API_KEY=fairshift-gemini-key:latest"
fi

echo "==> Letting the Cloud Run service account read the secrets"
NUMBER="$("$GCLOUD" projects describe "$PROJECT" --format='value(projectNumber)')"
SA="$NUMBER-compute@developer.gserviceaccount.com"
for s in fairshift-mongodb-uri fairshift-session-secret fairshift-feedback-secret fairshift-qr-secret fairshift-passport-secret fairshift-cron-secret fairshift-bank-key ${GEMINI_KEY:+fairshift-gemini-key}; do
  g secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null
done

echo "==> Building and deploying (Cloud Build → Cloud Run, a few minutes)"
g run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars DEMO_MODE=true \
  --set-secrets "$SECRETS"

URL="$(g run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

echo "==> Cloud Scheduler: escalate overdue hazards every 15 minutes"
CRON="$(g secrets versions access latest --secret fairshift-cron-secret)"
JOB_ARGS=(--location "$REGION" --schedule "*/15 * * * *" --uri "$URL/api/cron/hazards" --http-method POST --headers "Authorization=Bearer $CRON")
g scheduler jobs update http fairshift-hazard-sweep "${JOB_ARGS[@]}" >/dev/null 2>&1 || g scheduler jobs create http fairshift-hazard-sweep "${JOB_ARGS[@]}" >/dev/null
echo "    job fairshift-hazard-sweep ✓"
echo "==> Live at $URL"
curl -s --max-time 30 "$URL/api/health" && echo
