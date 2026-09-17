#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:6100/api/v1}"

json_field() {
  local field="$1"
  python3 -c "import json,sys; print(json.load(sys.stdin)${field})"
}

LOGIN=$(curl --fail --silent --show-error \
  -H 'Content-Type: application/json' \
  -d '{"organizationSlug":"safefleet-demo","email":"admin@safefleet.local","password":"ChangeMe123!"}' \
  "$BASE_URL/auth/login")
TOKEN=$(printf '%s' "$LOGIN" | json_field '["accessToken"]')
USER_ID=$(printf '%s' "$LOGIN" | json_field '["user"]["id"]')

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
DEVICE_AUTH=(
  -H "X-SafeFleet-Device-Id: $DEVICE_ID"
  -H "X-SafeFleet-Device-Key: $DEVICE_KEY"
  -H 'Content-Type: application/json'
)

CONTEXT_BEFORE=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  "$BASE_URL/device/context")
CONTEXT_DEVICE_ID=$(printf '%s' "$CONTEXT_BEFORE" | json_field '["device"]["id"]')
CONTEXT_DRIVER_ID=$(printf '%s' "$CONTEXT_BEFORE" | json_field '["driver"]["id"]')
CONTEXT_VEHICLE_ID=$(printf '%s' "$CONTEXT_BEFORE" | json_field '["vehicle"]["id"]')
CAN_START=$(printf '%s' "$CONTEXT_BEFORE" | json_field '["canStartTrip"]')
test "$CONTEXT_DEVICE_ID" = "$DEVICE_ID"
test "$CONTEXT_DRIVER_ID" = "$DRIVER_ID"
test "$CONTEXT_VEHICLE_ID" = "$VEHICLE_ID"
test "$CAN_START" = "True"

CLIENT_TRIP_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
TRIP=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"clientTripId\":\"$CLIENT_TRIP_ID\"}" \
  "$BASE_URL/device/trips/start")
TRIP_ID=$(printf '%s' "$TRIP" | json_field '["id"]')

TRIP_RETRY=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"clientTripId\":\"$CLIENT_TRIP_ID\"}" \
  "$BASE_URL/device/trips/start")
TRIP_RETRY_ID=$(printf '%s' "$TRIP_RETRY" | json_field '["id"]')
test "$TRIP_RETRY_ID" = "$TRIP_ID"

CONTEXT_ACTIVE=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  "$BASE_URL/device/context")
ACTIVE_CONTEXT_TRIP=$(printf '%s' "$CONTEXT_ACTIVE" | json_field '["activeTrip"]["id"]')
test "$ACTIVE_CONTEXT_TRIP" = "$TRIP_ID"

CAPTURED_AT=$(python3 -c 'from datetime import datetime,timezone; print(datetime.now(timezone.utc).isoformat().replace("+00:00","Z"))')

TELEMETRY_EVENT_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
TELEMETRY=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"points\":[{\"clientEventId\":\"$TELEMETRY_EVENT_ID\",\"capturedAt\":\"$CAPTURED_AT\",\"tripId\":\"$TRIP_ID\",\"latitude\":-6.2,\"longitude\":106.8,\"speedKph\":42.5,\"batteryPercent\":76,\"networkType\":\"4g\",\"appVersion\":\"ci\",\"modelVersion\":\"ci-model\"}]}" \
  "$BASE_URL/device/telemetry/batch")
TELEMETRY_ACCEPTED=$(printf '%s' "$TELEMETRY" | json_field '["accepted"]')
test "$TELEMETRY_ACCEPTED" = "1"

SENSOR_EVENT_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
SENSOR=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"readings\":[{\"clientEventId\":\"$SENSOR_EVENT_ID\",\"capturedAt\":\"$CAPTURED_AT\",\"tripId\":\"$TRIP_ID\",\"sensorId\":\"cabin-01\",\"sensorType\":\"CO\",\"value\":12.4,\"unit\":\"ppm\",\"sensorStatus\":\"OK\",\"latitude\":-6.2,\"longitude\":106.8}]}" \
  "$BASE_URL/device/sensor-readings/batch")
SENSOR_ACCEPTED=$(printf '%s' "$SENSOR" | json_field '["accepted"]')
test "$SENSOR_ACCEPTED" = "1"

CLIENT_EVENT_ID=$(python3 -c 'import uuid; print(uuid.uuid4())')
INGEST=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"events\":[{\"clientEventId\":\"$CLIENT_EVENT_ID\",\"capturedAt\":\"$CAPTURED_AT\",\"tripId\":\"$TRIP_ID\",\"severity\":\"HIGH\",\"drowsinessScore\":0.8,\"eyeAspectRatio\":0.2,\"mouthAspectRatio\":0.5,\"perclosPercent\":35,\"eyeClosureDurationMs\":1600,\"localAlarmTriggered\":true,\"thresholdProfile\":\"ci-v1\",\"appVersion\":\"ci\",\"modelVersion\":\"ci-model\",\"inferenceLatencyMs\":30,\"latitude\":-6.2,\"longitude\":106.8}]}" \
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

ASSIGNED=$(curl --fail --silent --show-error "${AUTH[@]}" \
  -d "{\"userId\":\"$USER_ID\",\"note\":\"CI assignment\"}" \
  "$BASE_URL/alerts/$ALERT_ID/assign")
ASSIGNED_USER_ID=$(printf '%s' "$ASSIGNED" | json_field '["assignedToUserId"]')
test "$ASSIGNED_USER_ID" = "$USER_ID"

SENSOR_HISTORY=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/sensor-readings?tripId=$TRIP_ID&sensorType=CO")
SENSOR_TYPE=$(printf '%s' "$SENSOR_HISTORY" | json_field '["items"][0]["sensorType"]')
test "$SENSOR_TYPE" = "CO"

DASHBOARD_SUMMARY=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/dashboard/summary")
ACTIVE_TRIPS=$(printf '%s' "$DASHBOARD_SUMMARY" | json_field '["activeTrips"]')
ACTIVE_ALERTS=$(printf '%s' "$DASHBOARD_SUMMARY" | json_field '["activeAlerts"]')
test "$ACTIVE_TRIPS" -ge 1
test "$ACTIVE_ALERTS" -ge 1

LIVE_FLEET=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/dashboard/live-fleet")
LIVE_TRIP_ID=$(printf '%s' "$LIVE_FLEET" | json_field '["items"][0]["tripId"]')
LIVE_LATITUDE=$(printf '%s' "$LIVE_FLEET" | json_field '["items"][0]["latitude"]')
test "$LIVE_TRIP_ID" = "$TRIP_ID"
test "$LIVE_LATITUDE" = "-6.2"

DASHBOARD_ALERTS=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/dashboard/active-alerts")
DASHBOARD_ALERT_ID=$(printf '%s' "$DASHBOARD_ALERTS" | json_field '["items"][0]["id"]')
DASHBOARD_ASSIGNEE=$(printf '%s' "$DASHBOARD_ALERTS" | json_field '["items"][0]["assignedToUserId"]')
test "$DASHBOARD_ALERT_ID" = "$ALERT_ID"
test "$DASHBOARD_ASSIGNEE" = "$USER_ID"

ANALYTICS_OVERVIEW=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/analytics/overview")
ANALYTICS_EVENTS=$(printf '%s' "$ANALYTICS_OVERVIEW" | json_field '["events"]["totalEvents"]')
test "$ANALYTICS_EVENTS" -ge 1

ANALYTICS_MODELS=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/analytics/models")
MODEL_VERSION=$(printf '%s' "$ANALYTICS_MODELS" | json_field '["items"][0]["modelVersion"]')
test "$MODEL_VERSION" = "ci-model"

ANALYTICS_LATENCY=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/analytics/latency")
LATENCY_SAMPLES=$(printf '%s' "$ANALYTICS_LATENCY" | json_field '["ingestion"]["samples"]')
test "$LATENCY_SAMPLES" -ge 1

ANALYTICS_TRENDS=$(curl --fail --silent --show-error -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/analytics/trends?bucket=hour")
TREND_COUNT=$(printf '%s' "$ANALYTICS_TRENDS" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["items"]))')
test "$TREND_COUNT" -ge 1

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

ENDED_AT=$(python3 -c 'from datetime import datetime,timezone; print(datetime.now(timezone.utc).isoformat().replace("+00:00","Z"))')
COMPLETED=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  -d "{\"endedAt\":\"$ENDED_AT\"}" \
  "$BASE_URL/device/trips/$TRIP_ID/complete")
COMPLETED_STATUS=$(printf '%s' "$COMPLETED" | json_field '["status"]')
test "$COMPLETED_STATUS" = "COMPLETED"

CONTEXT_AFTER=$(curl --fail --silent --show-error "${DEVICE_AUTH[@]}" \
  "$BASE_URL/device/context")
ACTIVE_AFTER=$(printf '%s' "$CONTEXT_AFTER" | python3 -c 'import json,sys; print(json.load(sys.stdin)["activeTrip"] is None)')
test "$ACTIVE_AFTER" = "True"

echo "SafeFleet Phase 4B mobile runtime smoke test passed"
