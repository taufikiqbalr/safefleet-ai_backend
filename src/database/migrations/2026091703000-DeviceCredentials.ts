import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeviceCredentials2026091703000 implements MigrationInterface {
  name = 'DeviceCredentials2026091703000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE devices
      ADD COLUMN api_key_hash varchar(255) NULL,
      ADD COLUMN api_key_hint varchar(16) NULL,
      ADD COLUMN api_key_issued_at timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE devices
      DROP COLUMN IF EXISTS api_key_issued_at,
      DROP COLUMN IF EXISTS api_key_hint,
      DROP COLUMN IF EXISTS api_key_hash
    `);
  }
}
