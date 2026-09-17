# Phase 4B — Mobile Runtime Contract

Phase 4B is a small backend compatibility layer for SafeFleet Android M1. It keeps driver-device operations on device credentials instead of requiring a human management JWT inside the vehicle.

## Authentication

All endpoints in this document use the existing device credential headers:

```text
X-SafeFleet-Device-Id: <device UUID>
X-SafeFleet-Device-Key: <device secret>
```

The mobile app should store the secret with Android Keystore-backed encryption and must never send a management-user JWT for normal trip operation.

## Device context

```text
GET /api/v1/device/context
```

The response resolves the operational device context in this order:

1. currently active trip;
2. active assignment bound to the device;
3. direct driver/vehicle references on the device record.

The response contains device, assignment, driver, vehicle, fleet, active trip, `bindingSource`, `canStartTrip`, and `requiredActions`.

`requiredActions` contains operational setup hints such as `BIND_DRIVER`, `BIND_VEHICLE`, `ACTIVATE_DRIVER`, and `ACTIVATE_VEHICLE`. It is not a risk score.

## Device-authenticated trip start

```text
POST /api/v1/device/trips/start
```

Request:

```json
{
  "clientTripId": "uuid",
  "startedAt": "2026-09-17T08:00:00Z"
}
```

`clientTripId` is required and makes a mobile retry idempotent. Driver, vehicle, fleet, assignment, organization, and device identity are derived by the backend and are not trusted from a mobile request body.

The backend refuses to start a new trip when the device is not bound to an active driver and active vehicle, or when the device already has an active trip.

## Device-authenticated trip completion

```text
POST /api/v1/device/trips/:id/complete
```

Optional request:

```json
{
  "endedAt": "2026-09-17T09:00:00Z"
}
```

The trip must belong to the authenticated device. `endedAt` allows a device that temporarily lost connectivity to preserve the actual local trip-end timestamp when it reconnects.

## Security properties

- organization identity is derived from the authenticated device credential;
- device ID is derived from the authentication headers;
- driver and vehicle are resolved server-side;
- a device cannot complete another device's trip;
- client-generated trip UUIDs provide retry idempotency;
- the immediate drowsiness alarm remains local to Android and does not depend on these endpoints.

## Mobile M1 dependency

SafeFleet Android M1 can now implement:

- secure credential import;
- authenticated context refresh;
- driver/vehicle/trip display;
- device-authenticated trip start;
- device-authenticated trip completion;
- reconnect-safe start/completion timestamps.
