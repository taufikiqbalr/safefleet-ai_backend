# Phase 0 — Backend Bootstrap

This document records the initial implementation baseline for SafeFleet AI Backend.

## Implemented in Phase 0

- NestJS + TypeScript application bootstrap
- environment validation with `@nestjs/config` and `class-validator`
- PostgreSQL integration through TypeORM
- PostGIS-enabled Docker database image
- initial migration enabling the PostGIS extension
- liveness and readiness endpoints
- Swagger/OpenAPI bootstrap at `/docs`
- global API prefix, validation pipe, Helmet, compression, and CORS configuration
- Docker development and production stages
- Docker Compose for backend + PostgreSQL/PostGIS
- GitHub Actions CI for lint, build, and tests
- module boundaries matching the target backend specification

## Quick Start

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run migration:run
npm run start:dev
```

The API is available at `http://localhost:3000/api/v1` and Swagger at `http://localhost:3000/docs`.

Health endpoints:

```text
GET /api/v1/health
GET /api/v1/health/live
GET /api/v1/health/ready
```

To run the whole development stack in Docker:

```bash
cp .env.example .env
docker compose up --build
```

Run migrations inside the backend container when required:

```bash
docker compose exec backend npm run migration:run
```

## Current Module Boundaries

The following modules are scaffolds only and intentionally contain no business logic yet:

- auth
- organizations
- users
- fleets
- drivers
- vehicles
- devices
- assignments
- trips
- telemetry
- safety-events
- drowsiness
- sensors
- risk
- alerts
- realtime
- notifications
- analytics
- reports
- audit

## Next Phase

Phase 1 should establish the domain and persistence foundation:

1. organization and tenant model;
2. users and role-based authorization;
3. drivers, vehicles, devices, and assignments;
4. trip lifecycle;
5. database migrations and indexes;
6. common API response, pagination, error, audit, and request-context conventions.

No drowsiness or risk-scoring rule should be hard-coded before the event schema, model-version metadata, timestamp semantics, and policy/versioning model are established.
