import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AnalyticsRangeQueryDto, AnalyticsTrendQueryDto } from './dto/analytics-query.dto';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async overview(organizationId: string, query: AnalyticsRangeQueryDto) {
    const range = this.resolveRange(query);
    const params = [organizationId, range.from, range.to];

    const [tripRows, eventRows, alertRows, feedbackRows, riskRows] = await Promise.all([
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS "totalTrips",
            COALESCE(
              SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, $3::timestamptz) - started_at))) / 3600,
              0
            )::double precision AS "drivingHours"
          FROM trips
          WHERE organization_id = $1
            AND started_at IS NOT NULL
            AND started_at >= $2
            AND started_at <= $3
        `,
        params,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS "totalEvents",
            count(*) FILTER (WHERE event_type = 'DROWSINESS')::int AS "drowsinessEvents"
          FROM safety_events
          WHERE organization_id = $1
            AND captured_at >= $2
            AND captured_at <= $3
        `,
        params,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS "totalAlerts",
            count(*) FILTER (WHERE severity = 'CRITICAL')::int AS "criticalAlerts",
            count(*) FILTER (WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED'))::int AS "activeAlerts",
            AVG(EXTRACT(EPOCH FROM (acknowledged_at - created_at))) FILTER (WHERE acknowledged_at IS NOT NULL)::double precision AS "avgAcknowledgeSeconds",
            AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL)::double precision AS "avgResolutionSeconds"
          FROM alerts
          WHERE organization_id = $1
            AND created_at >= $2
            AND created_at <= $3
        `,
        params,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          WITH latest_feedback AS (
            SELECT DISTINCT ON (safety_event_id)
              safety_event_id,
              classification
            FROM safety_event_feedback
            WHERE organization_id = $1
              AND created_at >= $2
              AND created_at <= $3
            ORDER BY safety_event_id, created_at DESC
          )
          SELECT
            count(*)::int AS "reviewedEvents",
            count(*) FILTER (WHERE classification = 'CONFIRMED')::int AS confirmed,
            count(*) FILTER (WHERE classification = 'FALSE_ALARM')::int AS "falseAlarm",
            count(*) FILTER (WHERE classification = 'UNCERTAIN')::int AS uncertain
          FROM latest_feedback
        `,
        params,
      ),
      this.dataSource.query<Array<{ riskLevel: string; count: number }>>(
        `
          SELECT risk_level AS "riskLevel", count(*)::int AS count
          FROM risk_snapshots
          WHERE organization_id = $1
            AND calculated_at >= $2
            AND calculated_at <= $3
          GROUP BY risk_level
          ORDER BY CASE risk_level
            WHEN 'CRITICAL' THEN 4
            WHEN 'WARNING' THEN 3
            WHEN 'CAUTION' THEN 2
            ELSE 1
          END DESC
        `,
        params,
      ),
    ]);

    const feedback = feedbackRows[0] ?? {};
    const reviewedEvents = Number(feedback.reviewedEvents ?? 0);
    const falseAlarm = Number(feedback.falseAlarm ?? 0);

    return {
      window: range,
      trips: tripRows[0] ?? { totalTrips: 0, drivingHours: 0 },
      events: eventRows[0] ?? { totalEvents: 0, drowsinessEvents: 0 },
      alerts: alertRows[0] ?? {
        totalAlerts: 0,
        criticalAlerts: 0,
        activeAlerts: 0,
        avgAcknowledgeSeconds: null,
        avgResolutionSeconds: null,
      },
      feedback: {
        ...feedback,
        falseAlarmRate: reviewedEvents > 0 ? falseAlarm / reviewedEvents : null,
      },
      riskDistribution: riskRows,
    };
  }

  async trends(organizationId: string, query: AnalyticsTrendQueryDto) {
    const range = this.resolveRange(query);
    const params = [organizationId, range.from, range.to, query.bucket];

    const [eventRows, alertRows] = await Promise.all([
      this.dataSource.query<Array<{ bucket: Date | string; count: number }>>(
        `
          SELECT date_trunc($4, captured_at) AS bucket, count(*)::int AS count
          FROM safety_events
          WHERE organization_id = $1
            AND captured_at >= $2
            AND captured_at <= $3
          GROUP BY 1
          ORDER BY 1
        `,
        params,
      ),
      this.dataSource.query<Array<{ bucket: Date | string; count: number }>>(
        `
          SELECT date_trunc($4, created_at) AS bucket, count(*)::int AS count
          FROM alerts
          WHERE organization_id = $1
            AND created_at >= $2
            AND created_at <= $3
          GROUP BY 1
          ORDER BY 1
        `,
        params,
      ),
    ]);

    const buckets = new Map<string, { bucket: string; safetyEvents: number; alerts: number }>();
    for (const row of eventRows) {
      const bucket = new Date(row.bucket).toISOString();
      buckets.set(bucket, { bucket, safetyEvents: Number(row.count), alerts: 0 });
    }
    for (const row of alertRows) {
      const bucket = new Date(row.bucket).toISOString();
      const current = buckets.get(bucket) ?? { bucket, safetyEvents: 0, alerts: 0 };
      current.alerts = Number(row.count);
      buckets.set(bucket, current);
    }

    return {
      window: range,
      bucket: query.bucket,
      items: [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)),
    };
  }

  async models(organizationId: string, query: AnalyticsRangeQueryDto) {
    const range = this.resolveRange(query);
    const rows = await this.dataSource.query<Array<Record<string, unknown>>>(
      `
        SELECT
          e.model_version AS "modelVersion",
          e.threshold_profile AS "thresholdProfile",
          count(*)::int AS "totalEvents",
          count(*) FILTER (WHERE feedback.classification = 'CONFIRMED')::int AS confirmed,
          count(*) FILTER (WHERE feedback.classification = 'FALSE_ALARM')::int AS "falseAlarm",
          count(*) FILTER (WHERE feedback.classification = 'UNCERTAIN')::int AS uncertain,
          AVG(e.inference_latency_ms) FILTER (WHERE e.inference_latency_ms IS NOT NULL)::double precision AS "avgInferenceLatencyMs",
          AVG(EXTRACT(EPOCH FROM (e.received_at - e.captured_at)) * 1000)::double precision AS "avgIngestionDelayMs"
        FROM safety_events e
        LEFT JOIN LATERAL (
          SELECT f.classification
          FROM safety_event_feedback f
          WHERE f.safety_event_id = e.id
          ORDER BY f.created_at DESC
          LIMIT 1
        ) feedback ON true
        WHERE e.organization_id = $1
          AND e.captured_at >= $2
          AND e.captured_at <= $3
        GROUP BY e.model_version, e.threshold_profile
        ORDER BY count(*) DESC, e.model_version NULLS LAST, e.threshold_profile NULLS LAST
      `,
      [organizationId, range.from, range.to],
    );

    return { window: range, items: rows };
  }

  async latency(organizationId: string, query: AnalyticsRangeQueryDto) {
    const range = this.resolveRange(query);
    const params = [organizationId, range.from, range.to];
    const [ingestionRows, riskRows, alertRows] = await Promise.all([
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS samples,
            AVG(EXTRACT(EPOCH FROM (received_at - captured_at)) * 1000)::double precision AS "avgMs",
            percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (received_at - captured_at)) * 1000)::double precision AS "p95Ms"
          FROM safety_events
          WHERE organization_id = $1
            AND captured_at >= $2
            AND captured_at <= $3
        `,
        params,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS samples,
            AVG(EXTRACT(EPOCH FROM (rs.calculated_at - e.received_at)) * 1000)::double precision AS "avgMs",
            percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (rs.calculated_at - e.received_at)) * 1000)::double precision AS "p95Ms"
          FROM risk_snapshots rs
          INNER JOIN safety_events e ON e.id = rs.safety_event_id
          WHERE rs.organization_id = $1
            AND rs.calculated_at >= $2
            AND rs.calculated_at <= $3
        `,
        params,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
          SELECT
            count(*)::int AS samples,
            AVG(EXTRACT(EPOCH FROM (a.created_at - e.received_at)) * 1000)::double precision AS "avgMs",
            percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.created_at - e.received_at)) * 1000)::double precision AS "p95Ms"
          FROM alerts a
          INNER JOIN safety_events e ON e.id = a.safety_event_id
          WHERE a.organization_id = $1
            AND a.created_at >= $2
            AND a.created_at <= $3
            AND a.occurrence_count = 1
        `,
        params,
      ),
    ]);

    return {
      window: range,
      ingestion: ingestionRows[0] ?? { samples: 0, avgMs: null, p95Ms: null },
      eventToRisk: riskRows[0] ?? { samples: 0, avgMs: null, p95Ms: null },
      eventToInitialAlert: {
        ...(alertRows[0] ?? { samples: 0, avgMs: null, p95Ms: null }),
        note: 'Only non-deduplicated alerts are included because active alert records update their latest source event.',
      },
      dashboardDelivery: {
        samples: 0,
        avgMs: null,
        p95Ms: null,
        note: 'Client-side delivery acknowledgement is not yet collected, so end-to-end dashboard latency cannot be measured reliably.',
      },
    };
  }

  private resolveRange(query: AnalyticsRangeQueryDto): DateRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be earlier than or equal to to');
    const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxRangeMs) {
      throw new BadRequestException('Analytics range cannot exceed 366 days');
    }
    return { from, to };
  }
}
