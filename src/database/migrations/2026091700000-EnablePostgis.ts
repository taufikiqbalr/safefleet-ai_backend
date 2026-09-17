import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostgis2026091700000 implements MigrationInterface {
  name = 'EnablePostgis2026091700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP EXTENSION IF EXISTS postgis');
  }
}
