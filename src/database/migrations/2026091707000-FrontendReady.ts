import { MigrationInterface, QueryRunner } from 'typeorm';

export class FrontendReady2026091707000 implements MigrationInterface {
  name = 'FrontendReady2026091707000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sensor_readings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        device_id uuid NOT NULL,
        trip_id uuid NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        client_event_id uuid NOT NULL,
        sync_batch_id uuid NULL,
        sequence_number integer NULL,
        sensor_id varchar(120) NOT NULL,
        sensor_type varchar(64) NOT NULL,
        value double precision NOT NULL,
        unit varchar(32) NOT NULL,
        sensor_status varchar(32) NULL,
        captured_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        latitude double precision NULL,
        longitude double precision NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT fk_sensor_readings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_sensor_readings_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT,
        CONSTRAINT fk_sensor_readings_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
        CONSTRAINT fk_sensor_readings_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        CONSTRAINT fk_sensor_readings_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        CONSTRAINT ck_sensor_readings_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
        CONSTRAINT ck_sensor_readings_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_sensor_readings_device_client_event ON sensor_readings (device_id, client_event_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_sensor_readings_org_captured_at ON sensor_readings (organization_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_sensor_readings_trip_captured_at ON sensor_readings (trip_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_sensor_readings_type_captured_at ON sensor_readings (organization_id, sensor_type, captured_at DESC)',
    );

    await queryRunner.query('ALTER TABLE alerts ADD COLUMN assigned_to_user_id uuid NULL');
    await queryRunner.query('ALTER TABLE alerts ADD COLUMN assigned_at timestamptz NULL');
    await queryRunner.query(
      'ALTER TABLE alerts ADD CONSTRAINT fk_alerts_assigned_user FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL',
    );
    await queryRunner.query(
      'CREATE INDEX idx_alerts_assigned_to_user ON alerts (organization_id, assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL',
    );

    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_telemetry_trip_captured_at ON telemetry_points (trip_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_safety_events_trip_captured_at ON safety_events (trip_id, captured_at DESC)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_safety_events_trip_captured_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_telemetry_trip_captured_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_alerts_assigned_to_user');
    await queryRunner.query('ALTER TABLE alerts DROP CONSTRAINT IF EXISTS fk_alerts_assigned_user');
    await queryRunner.query('ALTER TABLE alerts DROP COLUMN IF EXISTS assigned_at');
    await queryRunner.query('ALTER TABLE alerts DROP COLUMN IF EXISTS assigned_to_user_id');
    await queryRunner.query('DROP TABLE IF EXISTS sensor_readings');
  }
}
