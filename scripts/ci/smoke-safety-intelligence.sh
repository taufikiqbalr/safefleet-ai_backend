#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"

json_field() {
  local field="$1"
  python3 -c "import json,sys; print(json.load(sys.stdin)${field})"
}

TOKEN=$(curl --fail --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"organizationSlug":"safefleet-demo","email":"admin@safefleet.local","password":"ChangeMe123!"}' \
  "$BASE_URL/auth/login" | json_field '["accessToken"]')

AUTH=(-H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json')

POLICY=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"name":"ci-source-severity","version":1,"config":{"mode":"SOURCE_SEVERITY","severityMap":{"INFO":"NORMAL","WARNING":"CAUTION","HIGH":"WARNING","CRITICAL":"CRITICAL"},"alertAtOrAbove":"WARNING","repeatWindowSeconds":300,"repeatEscalation":[{"minEvents":3,"level":"CRITICAL"}]}}' \
  "$BASE_URL/risk-policies")
POLICY_ID=$(printf '%s' "$POLICY" | json_field '["id"]')
curl --fail --silent --show-error "${AUTH[@]}" -X POST \
  "$BASE_URL/risk-policies/$POLICY_ID/activate" > /dev/null

DRIVER=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"employeeCode":"CI-DRIVER-001","fullName":"CI Driver"}' \
  "$BASE_URL/drivers")
DRIVER_ID=$(printf '%s' "$DRIVER" | json_field '["id"]')

VEHICLE=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"plateNumber":"CI-0001","make":"SafeFleet","model":"Test"}' \
  "$BASE_URL/vehicles")
VEHICLE_ID=$(printf '%s' "$VEHICLE" | json_field '["id"]')

DEVICE_UID="ci-device-$(python3 -c 'import uuid; print(uuid.uuid4())')"
DEVICE=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d "{\"deviceUid\":\"$DEVICE_UID\",\"driverId\":\"$DRIVER_ID\",\"vehicleId\":\"$VEHICLE_ID\",\"platform\":\"android\",\"appVersion\":\"ci\",\"modelVersion\":\"ci-model\"}" \
  "$BASE_URL/devices")
DEVICE_ID=$(printf '%s' "$DEVICE" | json_field '["id"]')

CREDENTIAL=$(curl --fail --silent --show-error "${AUTH[@]}" -X POST \
  "$BASE_URL/devices/$DEVICE_ID/credentials/rotate")
DEVICE_KEY=$(printf '%s' "$CREDENTIAL" | json_field '["deviceKey"]')

CLIENT_TRIP_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
TRIP=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d "{\"driverId\":\"$DRIVER_ID\",\"vehicleId\":\"$VEHICLE_ID\",\"deviceId\":\"$DEVICE_ID\",\"clientTripId\":\"$CLIENT_TRIP_ID\"}" \
  "$BASE_URL/trips/start")
TRIP_ID=$(printf '%s' "$TRIP" | json_field '["id"]')

CLIENT_EVENT_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
CAPTURED_AT=$(python3 -c 'from datetime import datetime,timezone; print(datetime.now(timezone.utc).isoformat().replace("+00:00","Z"))')
INGEST=$(curl --fail --silent --show-error \
  -H "X-SafeFleet-Device-Id: $DEVICE_ID" \
  -H "X-SafeFleet-Device-Key: $DEVICE_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"events\":[{\"clientEventId\":\"$CLIENT_EVENT_ID\",\"capturedAt\":\"$CAPTURED_AT\",\"tripId\":\"$TRIP_ID\",\"severity\":\"HIGH\",\"drowsinessScore\":0.8,\"eyeAspectRatio\":0.2,\"mouthAspectRatio\":0.5,\"perclosPercent\":35,\"eyeClosureDurationMs\":1600,\"localAlarmTriggered\":true,\"thresholdProfile\":\"ci-v1\",\"appVersion\":\"ci\",\"modelVersion\":\"ci-model\",\"inferenceLatencyMs\":30}]}" \
  "$BASE_URL/device/drowsiness-events/batch")

ACCEPTED=$(printf '%s' "$INGEST" | json_field '["accepted"]')
test "$ACCEPTED" = "1"
EVENT_ID=$(printf '%s' "$INGEST" | json_field '["results"][0]["id"]')

SNAPSHOTS=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/risk-snapshots?tripId=$TRIP_ID")
RISK_LEVEL=$(printf '%s' "$SNAPSHOTS" | json_field '["items"][0]["riskLevel"]')
test "$RISK_LEVEL" = "WARNING"

ALERTS=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/alerts?tripId=$TRIP_ID")
ALERT_ID=$(printf '%s' "$ALERTS" | json_field '["items"][0]["id"]')
ALERT_STATUS=$(printf '%s' "$ALERTS" | json_field '["items"][0]["status"]')
test "$ALERT_STATUS" = "OPEN"

curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"note":"CI acknowledgement"}' \
  "$BASE_URL/alerts/$ALERT_ID/acknowledge" > /dev/null

curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"classification":"CONFIRMED","reason":"CI verification"}' \
  "$BASE_URL/safety-events/$EVENT_ID/feedback" > /dev/null

RESOLVED=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d '{"note":"CI resolved"}' \
  "$BASE_URL/alerts/$ALERT_ID/resolve")
RESOLVED_STATUS=$(printf '%s' "$RESOLVED" | json_field '["status"]')
test "$RESOLVED_STATUS" = "RESOLVED"

HISTORY=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/alerts/$ALERT_ID/history")
HISTORY_COUNT=$(printf '%s' "$HISTORY" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')
test "$HISTORY_COUNT" -ge 3

echo "SafeFleet safety intelligence smoke test passed"
