# Phase 4 — Frontend-Ready Fleet Operations Backend

Phase 4 turns the SafeFleet backend into a practical contract for the web dashboard while preserving the edge-first safety architecture established in Phases 0–3. The Android application remains responsible for immediate driver warning and computer-vision inference; this phase focuses on live fleet state, supervisor workflow, operational analytics, and optional cabin-sensor ingestion.

## Phase 4 scope

The implemented Phase 4 scope is the **MVP/frontend-ready backend**. It intentionally does not introduce Redis, a message broker, or distributed workers yet. The current single-backend Docker topology is sufficient for the hackathon/MVP workload and keeps the system easier to operate and demonstrate.

## 1. Dashboard summary

```text
GET /api/v1/dashboard/summary
```

The response is tenant-scoped from the authenticated user JWT and provides a compact operational summary for the web home/dashboard page:

- active trips;
- active alerts;
- recently online devices;
- active drivers;
- active vehicles;
- safety-event count in the last 24 hours;
- alert count in the last 24 hours;
- active alerts grouped by severity;
- active trips grouped by their latest available risk level.

No missing risk snapshot is silently converted into a risk classification. A trip without a calculated risk remains absent from the risk distribution rather than being labelled safe by assumption.

## 2. Live fleet state

```text
GET /api/v1/dashboard/live-fleet
GET /api/v1/dashboard/live-fleet?fleetId=<uuid>&staleAfterSeconds=120
```

Each active trip can include:

- driver identity and employee code;
- vehicle and plate number;
- fleet;
- registered device;
- latest GPS point;
- speed, battery, and network metadata;
- latest risk snapshot;
- highest-priority active alert;
- current alert assignee;
- operational connectivity state (`ONLINE`, `STALE`, or `OFFLINE`).

`staleAfterSeconds` is an operational dashboard parameter, not a scientific safety threshold. It controls only how the web UI interprets recency of device/telemetry contact.

## 3. Active alert queue

```text
GET /api/v1/dashboard/active-alerts
GET /api/v1/dashboard/active-alerts?fleetId=<uuid>&limit=25
```

This endpoint enriches active alerts with driver, vehicle, fleet, assignee, and latest trip location so the web supervisor screen does not need to make many independent API calls.

Alert assignment is now supported through:

```text
POST /api/v1/alerts/:id/assign
```

Example:

```json
{
  "userId": "supervisor-user-uuid",
  "note": "Assigned from operations desk"
}
```

Omitting `userId` clears the assignment. Resolved alerts cannot be reassigned. Existing acknowledgement, escalation, resolution, audit, and alert-status-history behavior remains unchanged.

## 4. Fleet safety analytics

Phase 4 activates the analytics module.

### Overview

```text
GET /api/v1/analytics/overview
GET /api/v1/analytics/overview?from=<ISO8601>&to=<ISO8601>
```

The default window is the previous seven days and the maximum requested range is 366 days.

Metrics include:

- total trips;
- driving hours;
- total safety events;
- drowsiness events;
- total, critical, and currently active alerts;
- average acknowledgement and resolution time;
- latest structured feedback counts;
- false-alarm rate among reviewed events;
- risk-snapshot distribution.

### Trends

```text
GET /api/v1/analytics/trends?bucket=day
GET /api/v1/analytics/trends?bucket=hour
```

The endpoint returns time buckets containing safety-event and alert counts for charting.

### Model and threshold-profile comparison

```text
GET /api/v1/analytics/models
```

The backend groups stored safety events by `modelVersion` and `thresholdProfile` and reports:

- event count;
- latest feedback classification counts;
- average mobile inference latency;
- average mobile-to-backend ingestion delay.

This is an operational/research comparison surface. It does not declare one model medically or scientifically superior.

### Latency analytics

```text
GET /api/v1/analytics/latency
```

The endpoint reports average and p95 samples for:

- capture → backend receipt;
- backend receipt → risk snapshot;
- backend receipt → initial alert for non-deduplicated alerts.

End-to-end browser delivery latency is explicitly reported as unavailable until the web client sends a delivery acknowledgement. The backend does not fabricate this metric.

## 5. Realtime location updates

Accepted telemetry batches now publish the latest known device telemetry through the existing authenticated Socket.IO organization room:

```text
telemetry.location.updated
```

Phase 3 realtime events remain available:

```text
safety.event.created
safety.event.feedback.created
risk.policy.activated
risk.updated
alert.created
alert.updated
```

The new sensor ingestion path also publishes:

```text
sensor.reading.updated
```

## 6. Cabin / environmental sensor ingestion

The optional cabin-safety path now has a generic device-authenticated ingestion contract:

```text
POST /api/v1/device/sensor-readings/batch
```

Management/history query:

```text
GET /api/v1/sensor-readings
```

Each reading stores:

- client-generated event UUID for idempotency;
- device, trip, driver, and vehicle context derived by the backend;
- sensor ID;
- generic sensor type;
- numeric value;
- unit;
- optional sensor status;
- capture and receipt timestamps;
- optional GPS;
- extensible metadata.

Example:

```json
{
  "readings": [
    {
      "clientEventId": "uuid",
      "capturedAt": "2026-09-17T07:00:00Z",
      "tripId": "uuid",
      "sensorId": "cabin-01",
      "sensorType": "CO",
      "value": 12.4,
      "unit": "ppm",
      "sensorStatus": "OK"
    }
  ]
}
```

The backend does **not** assign toxic-gas thresholds in Phase 4. Sensor thresholds must come from the selected hardware specification and an approved safety policy. This phase establishes reliable generic ingestion and historical storage only.

## 7. Database additions and indexes

Phase 4 adds:

```text
sensor_readings
```

and extends `alerts` with:

```text
assigned_to_user_id
assigned_at
```

Additional trip/time indexes are added for dashboard-oriented telemetry and safety-event lookup.

## 8. Docker and CI

The local stack remains intentionally simple:

```text
PostgreSQL/PostGIS
      |
      v
migrations
      |
      v
development seed
      |
      v
NestJS REST API + Socket.IO
```

Run:

```bash
cp .env.example .env
docker compose up --build
```

The end-to-end CI smoke path now verifies the frontend-ready contract by creating a trip/device, uploading telemetry, uploading a generic cabin reading, ingesting a drowsiness event, producing risk and an alert, assigning the alert, querying live dashboard state, querying analytics, and completing the supervisor alert workflow.

## MVP backend completion boundary

With Phase 4 implemented, the SafeFleet backend has the core interfaces required to begin direct integration with `safefleet-ai_web` and `safefleet-ai_mobile`.

The following items are deliberately deferred to production hardening rather than treated as blockers for the MVP:

- durable message broker / worker queue;
- Redis-backed Socket.IO adapter for multiple backend replicas;
- external push/email/messaging notification providers;
- browser delivery acknowledgements for true end-to-end alert latency;
- scheduled telemetry retention/downsampling jobs;
- long-running asynchronous report generation;
- production secret management, deployment orchestration, and full observability stack;
- hardware-specific toxic-gas threshold policy and validation.

Those concerns should be introduced only when deployment scale, hardware selection, and operational requirements are known.
