# Phase 1 — Dockerized Core Domain & Persistence

Phase 1 establishes the tenant, fleet, driver, vehicle, device, assignment, and trip persistence model used by later telemetry and safety-event modules.

## Docker-first development flow

The local development environment is intentionally orchestrated by Docker Compose:

1. `postgres` starts PostgreSQL 16 with PostGIS;
2. `migrate` waits for PostgreSQL health and runs all pending TypeORM migrations;
3. `backend` starts only after migrations complete successfully.

This means a normal developer startup is:

```bash
cp .env.example .env
docker compose up --build
```

No host PostgreSQL installation is required. The API remains available on `http://localhost:3000`, while PostgreSQL data is persisted in the named `safefleet-postgres-data` volume.

Useful commands:

```bash
# start in background
docker compose up -d --build

# follow backend logs
docker compose logs -f backend

# run migration state check
docker compose run --rm migrate npm run migration:show

# open psql inside the database container
docker compose exec postgres psql -U safefleet -d safefleet

# stop containers without deleting data
docker compose down

# destructive local reset: containers + database volume
docker compose down -v
```

## Core tables

Phase 1 introduces:

- `organizations` — tenant boundary;
- `users` — organization users and RBAC role metadata;
- `fleets` — fleet grouping;
- `drivers` — operational driver records;
- `vehicles` — fleet vehicles;
- `devices` — registered SafeFleet mobile devices;
- `assignments` — time-bounded driver/vehicle/device assignment;
- `trips` — trip lifecycle and mobile-generated `client_trip_id` for future offline/idempotent synchronization.

All domain tables use UUID primary keys and `created_at`, `updated_at`, and nullable `deleted_at` timestamps.

## Data integrity rules

The database migration provides explicit foreign keys, status checks, tenant-scoped uniqueness, and partial indexes for active records. Important rules include:

- one non-deleted organization per slug;
- unique user email inside an organization;
- unique fleet code, driver employee code, and vehicle plate number inside an organization;
- globally unique active device UID;
- one active assignment per driver and per vehicle;
- one active trip per driver and per vehicle;
- trip and assignment end time cannot precede start time.

Application services must still validate that related records belong to the same organization before writes. Database foreign keys alone do not enforce cross-table tenant equality.

## Safety boundary

This phase deliberately does not create medical or personal fitness classifications. Driver status represents operational account state only. Drowsiness, risk, alert, telemetry, and cabin-sensor records are implemented in subsequent phases and must retain event/model/version metadata.

## Next implementation slice

Phase 1B should add application services and API contracts around this schema:

- CRUD endpoints for organizations, fleets, drivers, vehicles, and devices;
- assignment start/end operations;
- trip start/complete/cancel operations;
- tenant-scoped query helpers;
- pagination and filtering;
- RBAC guards and authenticated request context;
- audit logging for safety-relevant changes.
