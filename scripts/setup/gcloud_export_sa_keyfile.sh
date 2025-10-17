# Variables
PROJECT_ID="discovery-383518"
SA_EMAIL="talent-api-sa@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="talent-api-sa-key.json"

# Create a new key and write it to JSON on disk
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"

# Inspect the file (optional)
jq '. | {client_email, client_id, project_id, type}' "${KEY_FILE}"

