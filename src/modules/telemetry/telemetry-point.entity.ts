import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'telemetry_points' })
@Index('idx_telemetry_org_captured_at', ['organizationId', 'capturedAt'])
@Index('idx_telemetry_device_captured_at', ['deviceId', 'capturedAt'])
@Index('uq_telemetry_device_client_event', ['deviceId', 'clientEventId'], { unique: true })
export class TelemetryPointEntity {
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

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ name: 'speed_kph', type: 'real', nullable: true })
  speedKph!: number | null;

  @Column({ name: 'battery_percent', type: 'smallint', nullable: true })
  batteryPercent!: number | null;

  @Column({ name: 'network_type', type: 'varchar', length: 32, nullable: true })
  networkType!: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 40, nullable: true })
  appVersion!: string | null;

  @Column({ name: 'model_version', type: 'varchar', length: 80, nullable: true })
  modelVersion!: string | null;

  @Column({ name: 'inference_latency_ms', type: 'integer', nullable: true })
  inferenceLatencyMs!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
