for SA in \
  "homeassistant-service-account@discovery-383518.iam.gserviceaccount.com" \
  "talent-api-sa@discovery-383518.iam.gserviceaccount.com" \
  "talent-api@discovery-383518.iam.gserviceaccount.com" \
  "workspace-tools-cf-worker@discovery-383518.iam.gserviceaccount.com"
do
  echo "== Keys for $SA =="
  gcloud iam service-accounts keys list \
    --iam-account="$SA" \
    --project="discovery-383518" \
    --format="table(name,keyType,createdAt,validBeforeTime)"
done

