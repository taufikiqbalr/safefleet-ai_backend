import { MigrationInterface, QueryRunner } from 'typeorm';

export class SafetyIntelligence2026091706000 implements MigrationInterface {
  name = 'SafetyIntelligence2026091706000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE risk_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        name varchar(120) NOT NULL,
        version integer NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'DRAFT',
        config jsonb NOT NULL DEFAULT '{}'::jsonb,
        activated_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_risk_policies_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT ck_risk_policy_status CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
        CONSTRAINT ck_risk_policy_version CHECK (version > 0)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_risk_policies_organization_id ON risk_policies (organization_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_risk_policy_name_version ON risk_policies (organization_id, name, version) WHERE deleted_at IS NULL',
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_risk_policy_active_org ON risk_policies (organization_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL",
    );

    await queryRunner.query(`
      CREATE TABLE risk_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        trip_id uuid NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        safety_event_id uuid NOT NULL,
        policy_id uuid NOT NULL,
        policy_version integer NOT NULL,
        risk_level varchar(24) NOT NULL,
        score real NULL,
        contributing_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
        calculated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_risk_snapshots_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_risk_snapshots_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
        CONSTRAINT fk_risk_snapshots_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        CONSTRAINT fk_risk_snapshots_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        CONSTRAINT fk_risk_snapshots_safety_event FOREIGN KEY (safety_event_id) REFERENCES safety_events(id) ON DELETE CASCADE,
        CONSTRAINT fk_risk_snapshots_policy FOREIGN KEY (policy_id) REFERENCES risk_policies(id) ON DELETE RESTRICT,
        CONSTRAINT ck_risk_snapshot_level CHECK (risk_level IN ('NORMAL', 'CAUTION', 'WARNING', 'CRITICAL')),
        CONSTRAINT ck_risk_snapshot_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX uq_risk_snapshot_safety_event ON risk_snapshots (safety_event_id)');
    await queryRunner.query('CREATE INDEX idx_risk_snapshots_org_calculated_at ON risk_snapshots (organization_id, calculated_at DESC)');
    await queryRunner.query('CREATE INDEX idx_risk_snapshots_trip_id ON risk_snapshots (trip_id)');

    await queryRunner.query(`
      CREATE TABLE alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        trip_id uuid NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        safety_event_id uuid NULL,
        risk_snapshot_id uuid NULL,
        alert_type varchar(48) NOT NULL,
        severity varchar(24) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'OPEN',
        title varchar(180) NOT NULL,
        message text NULL,
        dedupe_key varchar(240) NOT NULL,
        occurrence_count integer NOT NULL DEFAULT 1,
        first_event_at timestamptz NOT NULL,
        last_event_at timestamptz NOT NULL,
        acknowledged_by_user_id uuid NULL,
        acknowledged_at timestamptz NULL,
        resolved_by_user_id uuid NULL,
        resolved_at timestamptz NULL,
        resolution_notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_alerts_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_alerts_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_safety_event FOREIGN KEY (safety_event_id) REFERENCES safety_events(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_risk_snapshot FOREIGN KEY (risk_snapshot_id) REFERENCES risk_snapshots(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_ack_user FOREIGN KEY (acknowledged_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_alerts_resolved_user FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_alert_severity CHECK (severity IN ('NORMAL', 'CAUTION', 'WARNING', 'CRITICAL')),
        CONSTRAINT ck_alert_status CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED')),
        CONSTRAINT ck_alert_occurrence_count CHECK (occurrence_count > 0)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_alerts_org_created_at ON alerts (organization_id, created_at DESC)');
    await queryRunner.query('CREATE INDEX idx_alerts_trip_id ON alerts (trip_id)');
    await queryRunner.query('CREATE INDEX idx_alerts_status ON alerts (organization_id, status)');
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_alerts_active_dedupe ON alerts (organization_id, dedupe_key) WHERE status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED')",
    );

    await queryRunner.query(`
      CREATE TABLE alert_status_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        alert_id uuid NOT NULL,
        from_status varchar(24) NULL,
        to_status varchar(24) NOT NULL,
        actor_user_id uuid NULL,
        note text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_alert_history_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_alert_history_alert FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
        CONSTRAINT fk_alert_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_alert_history_from_status CHECK (from_status IS NULL OR from_status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED')),
        CONSTRAINT ck_alert_history_to_status CHECK (to_status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_alert_history_alert_id ON alert_status_history (alert_id, created_at)');

    await queryRunner.query(`
      CREATE TABLE safety_event_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        safety_event_id uuid NOT NULL,
        reviewer_user_id uuid NOT NULL,
        classification varchar(24) NOT NULL,
        reason text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_feedback_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_feedback_event FOREIGN KEY (safety_event_id) REFERENCES safety_events(id) ON DELETE CASCADE,
        CONSTRAINT fk_feedback_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT ck_feedback_classification CHECK (classification IN ('CONFIRMED', 'FALSE_ALARM', 'UNCERTAIN'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_feedback_event_id ON safety_event_feedback (safety_event_id, created_at DESC)');
    await queryRunner.query('CREATE INDEX idx_feedback_org_created_at ON safety_event_feedback (organization_id, created_at DESC)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS safety_event_feedback');
    await queryRunner.query('DROP TABLE IF EXISTS alert_status_history');
    await queryRunner.query('DROP TABLE IF EXISTS alerts');
    await queryRunner.query('DROP TABLE IF EXISTS risk_snapshots');
    await queryRunner.query('DROP TABLE IF EXISTS risk_policies');
  }
}
