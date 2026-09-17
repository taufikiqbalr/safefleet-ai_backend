# Phase 1B — Authentication and Core Operations API

Phase 1B turns the Phase 1 persistence model into a tenant-scoped HTTP API that can be used by the SafeFleet web application and, later, by mobile/device-specific authentication flows.

## Docker-first development flow

The default development stack is intentionally containerized:

```text
PostgreSQL/PostGIS -> migrate -> development seed -> NestJS backend
```

Start it with:

```bash
cp .env.example .env
docker compose up --build
```

The `seed` container is idempotent. With `DEV_SEED_ENABLED=true`, it creates a local demo organization and owner account only when they do not already exist. Do not reuse development credentials in a deployed environment.

## Authentication

Initial authentication is organization-scoped email/password authentication with a signed JWT access token.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "organizationSlug": "safefleet-demo",
  "email": "admin@safefleet.local",
  "password": "ChangeMe123!"
}
```

The returned access token is supplied as:

```http
Authorization: Bearer <access-token>
```

Other auth endpoints:

```text
GET  /api/v1/auth/me
POST /api/v1/auth/change-password
```

The initial implementation intentionally has no public self-registration endpoint. Organizations and owner credentials should be provisioned administratively; the Docker seed is only a development convenience.

## Tenant isolation and RBAC

The JWT carries `organizationId` and role claims. Repositories still scope data access by the organization identifier instead of accepting tenant identifiers directly from URL payloads.

Roles currently defined:

- `OWNER`
- `ADMIN`
- `SUPERVISOR`
- `ANALYST`
- `VIEWER`

Mutating fleet operations are limited to operational roles. User and organization administration is further restricted to owner/admin roles.

## Core API surface

### Organization and users

```text
GET   /api/v1/organizations/current
PATCH /api/v1/organizations/current
GET   /api/v1/users
GET   /api/v1/users/:id
POST  /api/v1/users
PATCH /api/v1/users/:id
```

### Fleets

```text
GET    /api/v1/fleets
GET    /api/v1/fleets/:id
POST   /api/v1/fleets
PATCH  /api/v1/fleets/:id
DELETE /api/v1/fleets/:id
```

### Drivers

```text
GET    /api/v1/drivers
GET    /api/v1/drivers/:id
POST   /api/v1/drivers
PATCH  /api/v1/drivers/:id
DELETE /api/v1/drivers/:id
```

### Vehicles

```text
GET    /api/v1/vehicles
GET    /api/v1/vehicles/:id
POST   /api/v1/vehicles
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id
```

### Devices

```text
GET  /api/v1/devices
GET  /api/v1/devices/:id
POST /api/v1/devices
PATCH /api/v1/devices/:id
POST /api/v1/devices/:id/revoke
```

This is management-plane device registration. A separate device credential flow should be added before mobile clients are permitted to ingest safety telemetry without a human user token.

### Driver/vehicle assignments

```text
GET  /api/v1/assignments
GET  /api/v1/assignments/:id
POST /api/v1/assignments
POST /api/v1/assignments/:id/end
```

The service verifies tenant ownership of referenced drivers, vehicles, and devices. Existing database constraints remain the final concurrency-safe protection against conflicting active assignments.

### Trips

```text
GET  /api/v1/trips
GET  /api/v1/trips/:id
POST /api/v1/trips/start
POST /api/v1/trips/:id/complete
POST /api/v1/trips/:id/cancel
```

`clientTripId` is accepted when a mobile or edge client starts a trip. Repeating a start request with the same tenant-scoped `clientTripId` returns the existing trip, providing the first idempotency primitive for offline/retry behavior.

## Audit trail

Successful authenticated non-read HTTP operations are recorded in `audit_logs` through a global interceptor. Audit persistence failures are logged by the backend but do not reverse an already completed domain operation. A production hardening phase should move safety-critical auditing to a transactional outbox or equivalent mechanism.

Audit records are tenant-scoped and can be queried with:

```text
GET /api/v1/audit
```

## What is not yet implemented

Phase 1B does **not** yet provide:

- refresh-token rotation;
- password reset/email invitation workflow;
- device-specific credentials or mobile attestation;
- safety-event ingestion;
- telemetry ingestion;
- WebSocket realtime events;
- risk calculation;
- alert generation/escalation;
- notification delivery.

Those belong to the next backend phases. The immediate next step is the ingestion contract for device telemetry and normalized safety events, while keeping the driver's local alarm independent of cloud availability.
