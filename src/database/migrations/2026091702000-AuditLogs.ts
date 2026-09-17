import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogs2026091702000 implements MigrationInterface {
  name = 'AuditLogs2026091702000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        actor_user_id uuid NULL,
        action varchar(160) NOT NULL,
        resource_type varchar(80) NOT NULL,
        resource_id uuid NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_audit_logs_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_organization_created_at ON audit_logs (organization_id, created_at DESC)',
    );
    await queryRunner.query('CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id)');
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
  }
}
