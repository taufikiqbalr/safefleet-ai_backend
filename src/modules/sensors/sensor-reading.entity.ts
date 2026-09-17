import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'sensor_readings' })
@Index('idx_sensor_readings_org_captured_at', ['organizationId', 'capturedAt'])
@Index('idx_sensor_readings_trip_captured_at', ['tripId', 'capturedAt'])
@Index('idx_sensor_readings_type_captured_at', ['organizationId', 'sensorType', 'capturedAt'])
@Index('uq_sensor_readings_device_client_event', ['deviceId', 'clientEventId'], { unique: true })
export class SensorReadingEntity {
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

  @Column({ name: 'sensor_id', type: 'varchar', length: 120 })
  sensorId!: string;

  @Column({ name: 'sensor_type', type: 'varchar', length: 64 })
  sensorType!: string;

  @Column({ type: 'double precision' })
  value!: number;

  @Column({ type: 'varchar', length: 32 })
  unit!: string;

  @Column({ name: 'sensor_status', type: 'varchar', length: 32, nullable: true })
  sensorStatus!: string | null;

  @Column({ name: 'captured_at', type: 'timestamptz' })
  capturedAt!: Date;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'now()' })
  receivedAt!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
