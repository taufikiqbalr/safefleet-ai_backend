import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { DashboardAlertsQueryDto, LiveFleetQueryDto } from './dto/dashboard-query.dto';

interface SummaryRow {
  activeTrips: number;
  activeAlerts: number;
  onlineDevices: number;
  activeDrivers: number;
  activeVehicles: number;
  safetyEvents24h: number;
  alerts24h: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async summary(organizationId: string) {
    const [summaryRows, alertSeverity, riskDistribution] = await Promise.all([
      this.dataSource.query<SummaryRow[]>(
        `
          SELECT
            (SELECT count(*)::int FROM trips WHERE organization_id = $1 AND status = 'ACTIVE') AS "activeTrips",
            (SELECT count(*)::int FROM alerts WHERE organization_id = $1 AND status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED')) AS "activeAlerts",
            (SELECT count(*)::int FROM devices WHERE organization_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL AND last_seen_at >= now() - interval '5 minutes') AS "onlineDevices",
            (SELECT count(*)::int FROM drivers WHERE organization_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL) AS "activeDrivers",
            (SELECT count(*)::int FROM vehicles WHERE organization_id = $1 AND status = 'ACTIVE' AND deleted_at IS NULL) AS "activeVehicles",
            (SELECT count(*)::int FROM safety_events WHERE organization_id = $1 AND captured_at >= now() - interval '24 hours') AS "safetyEvents24h",
            (SELECT count(*)::int FROM alerts WHERE organization_id = $1 AND created_at >= now() - interval '24 hours') AS "alerts24h"
        `,
        [organizationId],
      ),
      this.dataSource.query<Array<{ severity: string; count: number }>>(
        `
          SELECT severity, count(*)::int AS count
          FROM alerts
          WHERE organization_id = $1
            AND status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED')
          GROUP BY severity
          ORDER BY CASE severity
            WHEN 'CRITICAL' THEN 4
            WHEN 'WARNING' THEN 3
            WHEN 'CAUTION' THEN 2
            ELSE 1
          END DESC
        `,
        [organizationId],
      ),
      this.dataSource.query<Array<{ riskLevel: string; count: number }>>(
        `
          SELECT latest.risk_level AS "riskLevel", count(*)::int AS count
          FROM (
            SELECT DISTINCT ON (rs.trip_id) rs.trip_id, rs.risk_level
            FROM risk_snapshots rs
            INNER JOIN trips t ON t.id = rs.trip_id
            WHERE rs.organization_id = $1
              AND rs.trip_id IS NOT NULL
              AND t.status = 'ACTIVE'
            ORDER BY rs.trip_id, rs.calculated_at DESC
          ) latest
          GROUP BY latest.risk_level
          ORDER BY CASE latest.risk_level
            WHEN 'CRITICAL' THEN 4
            WHEN 'WARNING' THEN 3
            WHEN 'CAUTION' THEN 2
            ELSE 1
          END DESC
        `,
        [organizationId],
      ),
    ]);

    return {
      generatedAt: new Date(),
      ...(summaryRows[0] ?? {
        activeTrips: 0,
        activeAlerts: 0,
        onlineDevices: 0,
        activeDrivers: 0,
        activeVehicles: 0,
        safetyEvents24h: 0,
        alerts24h: 0,
      }),
      activeAlertsBySeverity: alertSeverity,
      activeTripsByLatestRisk: riskDistribution,
    };
  }

  async liveFleet(organizationId: string, query: LiveFleetQueryDto) {
    const params: unknown[] = [organizationId];
    let fleetFilter = '';
    if (query.fleetId) {
      params.push(query.fleetId);
      fleetFilter = `AND COALESCE(t.fleet_id, v.fleet_id) = $${params.length}`;
    }

    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `
        SELECT
          t.id AS "tripId",
          t.started_at AS "tripStartedAt",
          d.id AS "driverId",
          d.employee_code AS "driverCode",
          d.full_name AS "driverName",
          v.id AS "vehicleId",
          v.plate_number AS "plateNumber",
          v.make AS "vehicleMake",
          v.model AS "vehicleModel",
          f.id AS "fleetId",
          f.name AS "fleetName",
          dev.id AS "deviceId",
          dev.device_uid AS "deviceUid",
          dev.last_seen_at AS "deviceLastSeenAt",
          tel.captured_at AS "locationCapturedAt",
          tel.received_at AS "locationReceivedAt",
          tel.latitude AS latitude,
          tel.longitude AS longitude,
          tel.speed_kph AS "speedKph",
          tel.battery_percent AS "batteryPercent",
          tel.network_type AS "networkType",
          rs.risk_level AS "riskLevel",
          rs.score AS "riskScore",
          rs.calculated_at AS "riskCalculatedAt",
          al.id AS "alertId",
          al.severity AS "alertSeverity",
          al.status AS "alertStatus",
          al.occurrence_count AS "alertOccurrenceCount",
          al.last_event_at AS "alertLastEventAt",
          al.assigned_to_user_id AS "alertAssignedToUserId",
          assignee.full_name AS "alertAssignedToName"
        FROM trips t
        INNER JOIN drivers d ON d.id = t.driver_id
        INNER JOIN vehicles v ON v.id = t.vehicle_id
        LEFT JOIN fleets f ON f.id = COALESCE(t.fleet_id, v.fleet_id)
        LEFT JOIN devices dev ON dev.id = t.device_id
        LEFT JOIN LATERAL (
          SELECT tp.*
          FROM telemetry_points tp
          WHERE tp.organization_id = t.organization_id
            AND tp.trip_id = t.id
          ORDER BY tp.captured_at DESC
          LIMIT 1
        ) tel ON true
        LEFT JOIN LATERAL (
          SELECT r.*
          FROM risk_snapshots r
          WHERE r.organization_id = t.organization_id
            AND r.trip_id = t.id
          ORDER BY r.calculated_at DESC
          LIMIT 1
        ) rs ON true
        LEFT JOIN LATERAL (
          SELECT a.*
          FROM alerts a
          WHERE a.organization_id = t.organization_id
            AND a.trip_id = t.id
            AND a.status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED')
          ORDER BY CASE a.severity
            WHEN 'CRITICAL' THEN 4
            WHEN 'WARNING' THEN 3
            WHEN 'CAUTION' THEN 2
            ELSE 1
          END DESC, a.last_event_at DESC
          LIMIT 1
        ) al ON true
        LEFT JOIN users assignee ON assignee.id = al.assigned_to_user_id
        WHERE t.organization_id = $1
          AND t.status = 'ACTIVE'
          ${fleetFilter}
        ORDER BY
          CASE rs.risk_level
            WHEN 'CRITICAL' THEN 4
            WHEN 'WARNING' THEN 3
            WHEN 'CAUTION' THEN 2
            WHEN 'NORMAL' THEN 1
            ELSE 0
          END DESC,
          t.started_at DESC NULLS LAST
      `,
      params,
    );

    const now = Date.now();
    const staleAfterMs = query.staleAfterSeconds * 1000;
    const items = rows.map((row) => {
      const lastSeenCandidates = [row.deviceLastSeenAt, row.locationReceivedAt]
        .filter(Boolean)
        .map((value) => new Date(value as string | Date).getTime());
      const latestSeenAt = lastSeenCandidates.length > 0 ? Math.max(...lastSeenCandidates) : null;
      const connectionStatus =
        latestSeenAt === null ? 'OFFLINE' : now - latestSeenAt <= staleAfterMs ? 'ONLINE' : 'STALE';

      return {
        ...row,
        connectionStatus,
        latestSeenAt: latestSeenAt === null ? null : new Date(latestSeenAt),
      };
    });

    return {
      generatedAt: new Date(),
      staleAfterSeconds: query.staleAfterSeconds,
      items,
    };
  }

  async activeAlerts(organizationId: string, query: DashboardAlertsQueryDto) {
    const params: unknown[] = [organizationId];
    let fleetFilter = '';
    if (query.fleetId) {
      params.push(query.fleetId);
      fleetFilter = `AND COALESCE(t.fleet_id, v.fleet_id) = $${params.length}`;
    }
    params.push(query.limit);
    const limitPlaceholder = `$${params.length}`;

    const items = await this.dataSource.query<Array<Record<string, unknown>>>(
      `
        SELECT
          a.id,
          a.alert_type AS "alertType",
          a.severity,
          a.status,
          a.title,
          a.message,
          a.occurrence_count AS "occurrenceCount",
          a.first_event_at AS "firstEventAt",
          a.last_event_at AS "lastEventAt",
          a.assigned_to_user_id AS "assignedToUserId",
          a.assigned_at AS "assignedAt",
          assignee.full_name AS "assignedToName",
          a.acknowledged_at AS "acknowledgedAt",
          a.created_at AS "createdAt",
          t.id AS "tripId",
          d.id AS "driverId",
          d.full_name AS "driverName",
          d.employee_code AS "driverCode",
          v.id AS "vehicleId",
          v.plate_number AS "plateNumber",
          f.id AS "fleetId",
          f.name AS "fleetName",
          tel.latitude,
          tel.longitude,
          tel.captured_at AS "locationCapturedAt"
        FROM alerts a
        LEFT JOIN trips t ON t.id = a.trip_id
        LEFT JOIN drivers d ON d.id = a.driver_id
        LEFT JOIN vehicles v ON v.id = a.vehicle_id
        LEFT JOIN fleets f ON f.id = COALESCE(t.fleet_id, v.fleet_id)
        LEFT JOIN users assignee ON assignee.id = a.assigned_to_user_id
        LEFT JOIN LATERAL (
          SELECT tp.latitude, tp.longitude, tp.captured_at
          FROM telemetry_points tp
          WHERE tp.organization_id = a.organization_id
            AND tp.trip_id = a.trip_id
            AND tp.latitude IS NOT NULL
            AND tp.longitude IS NOT NULL
          ORDER BY tp.captured_at DESC
          LIMIT 1
        ) tel ON true
        WHERE a.organization_id = $1
          AND a.status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED')
          ${fleetFilter}
        ORDER BY CASE a.severity
          WHEN 'CRITICAL' THEN 4
          WHEN 'WARNING' THEN 3
          WHEN 'CAUTION' THEN 2
          ELSE 1
        END DESC, a.last_event_at DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
    );

    return { generatedAt: new Date(), items };
  }
}
