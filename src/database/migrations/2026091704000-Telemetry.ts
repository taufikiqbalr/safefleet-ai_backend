import { MigrationInterface, QueryRunner } from 'typeorm';

export class Telemetry2026091704000 implements MigrationInterface {
  name = 'Telemetry2026091704000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE telemetry_points (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        device_id uuid NOT NULL,
        trip_id uuid NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        client_event_id uuid NOT NULL,
        sync_batch_id uuid NULL,
        sequence_number integer NULL,
        captured_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        latitude double precision NULL,
        longitude double precision NULL,
        speed_kph real NULL,
        battery_percent smallint NULL,
        network_type varchar(32) NULL,
        app_version varchar(40) NULL,
        model_version varchar(80) NULL,
        inference_latency_ms integer NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT fk_telemetry_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_telemetry_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT,
        CONSTRAINT fk_telemetry_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE RESTRICT,
        CONSTRAINT fk_telemetry_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_telemetry_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        CONSTRAINT ck_telemetry_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
        CONSTRAINT ck_telemetry_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
        CONSTRAINT ck_telemetry_speed CHECK (speed_kph IS NULL OR speed_kph >= 0),
        CONSTRAINT ck_telemetry_battery CHECK (battery_percent IS NULL OR (battery_percent >= 0 AND battery_percent <= 100)),
        CONSTRAINT ck_telemetry_inference_latency CHECK (inference_latency_ms IS NULL OR inference_latency_ms >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_telemetry_device_client_event ON telemetry_points (device_id, client_event_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_telemetry_org_captured_at ON telemetry_points (organization_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_telemetry_device_captured_at ON telemetry_points (device_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_telemetry_trip_captured_at ON telemetry_points (trip_id, captured_at DESC) WHERE trip_id IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS telemetry_points');
  }
}
