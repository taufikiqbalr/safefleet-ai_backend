import { MigrationInterface, QueryRunner } from 'typeorm';

export class SafetyEvents2026091705000 implements MigrationInterface {
  name = 'SafetyEvents2026091705000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE safety_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        device_id uuid NOT NULL,
        trip_id uuid NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        client_event_id uuid NOT NULL,
        sync_batch_id uuid NULL,
        sequence_number integer NULL,
        event_type varchar(40) NOT NULL,
        severity varchar(24) NOT NULL,
        source_alert_level varchar(40) NULL,
        drowsiness_score real NULL,
        local_alarm_triggered boolean NULL,
        threshold_profile varchar(80) NULL,
        captured_at timestamptz NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        latitude double precision NULL,
        longitude double precision NULL,
        app_version varchar(40) NULL,
        model_version varchar(80) NULL,
        inference_latency_ms integer NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT fk_safety_events_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_safety_events_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT,
        CONSTRAINT fk_safety_events_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE RESTRICT,
        CONSTRAINT fk_safety_events_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_safety_events_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        CONSTRAINT ck_safety_events_type CHECK (event_type IN ('DROWSINESS', 'CABIN_GAS', 'DRIVER_DISTRACTION', 'DEVICE_HEALTH')),
        CONSTRAINT ck_safety_events_severity CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
        CONSTRAINT ck_safety_events_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
        CONSTRAINT ck_safety_events_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
        CONSTRAINT ck_safety_events_inference_latency CHECK (inference_latency_ms IS NULL OR inference_latency_ms >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_safety_events_device_client_event ON safety_events (device_id, client_event_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_safety_events_org_captured_at ON safety_events (organization_id, captured_at DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_safety_events_trip_captured_at ON safety_events (trip_id, captured_at DESC) WHERE trip_id IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX idx_safety_events_type_severity ON safety_events (event_type, severity, captured_at DESC)',
    );

    await queryRunner.query(`
      CREATE TABLE drowsiness_event_details (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        safety_event_id uuid NOT NULL UNIQUE,
        eye_aspect_ratio real NULL,
        mouth_aspect_ratio real NULL,
        perclos_percent real NULL,
        blink_rate_per_minute real NULL,
        eye_closure_duration_ms integer NULL,
        yawning boolean NULL,
        yawn_duration_ms integer NULL,
        head_pitch_deg real NULL,
        head_yaw_deg real NULL,
        head_roll_deg real NULL,
        face_detected boolean NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_drowsiness_detail_event FOREIGN KEY (safety_event_id) REFERENCES safety_events(id) ON DELETE CASCADE,
        CONSTRAINT ck_drowsiness_perclos CHECK (perclos_percent IS NULL OR (perclos_percent >= 0 AND perclos_percent <= 100)),
        CONSTRAINT ck_drowsiness_ear CHECK (eye_aspect_ratio IS NULL OR eye_aspect_ratio >= 0),
        CONSTRAINT ck_drowsiness_mar CHECK (mouth_aspect_ratio IS NULL OR mouth_aspect_ratio >= 0),
        CONSTRAINT ck_drowsiness_blink_rate CHECK (blink_rate_per_minute IS NULL OR blink_rate_per_minute >= 0),
        CONSTRAINT ck_drowsiness_eye_closure CHECK (eye_closure_duration_ms IS NULL OR eye_closure_duration_ms >= 0),
        CONSTRAINT ck_drowsiness_yawn_duration CHECK (yawn_duration_ms IS NULL OR yawn_duration_ms >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_drowsiness_details_event_id ON drowsiness_event_details (safety_event_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS drowsiness_event_details');
    await queryRunner.query('DROP TABLE IF EXISTS safety_events');
  }
}
