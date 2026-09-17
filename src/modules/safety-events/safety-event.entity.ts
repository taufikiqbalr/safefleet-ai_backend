import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { SafetyEventType, SafetySeverity } from '../../common/enums/domain.enums';

@Entity({ name: 'safety_events' })
@Index('idx_safety_events_org_captured_at', ['organizationId', 'capturedAt'])
@Index('uq_safety_events_device_client_event', ['deviceId', 'clientEventId'], { unique: true })
export class SafetyEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'device_id', type: 'uuid' })
  deviceId!: string;

  @Column({ name: 'trip_id', type: 'uuid', nullable: true })
  tripId!: string | null;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Column({ name: 'client_event_id', type: 'uuid' })
  clientEventId!: string;

  @Column({ name: 'sync_batch_id', type: 'uuid', nullable: true })
  syncBatchId!: string | null;

  @Column({ name: 'sequence_number', type: 'integer', nullable: true })
  sequenceNumber!: number | null;

  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType!: SafetyEventType;

  @Column({ type: 'varchar', length: 24 })
  severity!: SafetySeverity;

  @Column({ name: 'source_alert_level', type: 'varchar', length: 40, nullable: true })
  sourceAlertLevel!: string | null;

  @Column({ name: 'drowsiness_score', type: 'real', nullable: true })
  drowsinessScore!: number | null;

  @Column({ name: 'local_alarm_triggered', type: 'boolean', nullable: true })
  localAlarmTriggered!: boolean | null;

  @Column({ name: 'threshold_profile', type: 'varchar', length: 80, nullable: true })
  thresholdProfile!: string | null;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ name: 'app_version', type: 'varchar', length: 40, nullable: true })
  appVersion!: string | null;

  @Column({ name: 'model_version', type: 'varchar', length: 80, nullable: true })
  modelVersion!: string | null;

  @Column({ name: 'inference_latency_ms', type: 'integer', nullable: true })
  inferenceLatencyMs!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
