import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoreDomain2026091701000 implements MigrationInterface {
  name = 'CoreDomain2026091701000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(160) NOT NULL,
        slug varchar(80) NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        timezone varchar(64) NOT NULL DEFAULT 'UTC',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT ck_organizations_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_organizations_slug ON organizations (slug) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        email varchar(320) NOT NULL,
        full_name varchar(160) NOT NULL,
        role varchar(32) NOT NULL DEFAULT 'VIEWER',
        status varchar(32) NOT NULL DEFAULT 'INVITED',
        password_hash varchar(255) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT ck_users_role CHECK (role IN ('OWNER', 'ADMIN', 'SUPERVISOR', 'ANALYST', 'VIEWER')),
        CONSTRAINT ck_users_status CHECK (status IN ('INVITED', 'ACTIVE', 'DISABLED'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_users_organization_id ON users (organization_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_users_organization_email ON users (organization_id, lower(email)) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE fleets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        description text NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_fleets_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT ck_fleets_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_fleets_organization_id ON fleets (organization_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_fleets_organization_code ON fleets (organization_id, code) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE drivers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        employee_code varchar(80) NOT NULL,
        full_name varchar(160) NOT NULL,
        phone varchar(40) NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_drivers_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT ck_drivers_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_drivers_organization_id ON drivers (organization_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_drivers_organization_employee_code ON drivers (organization_id, employee_code) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        fleet_id uuid NULL,
        plate_number varchar(32) NOT NULL,
        external_code varchar(80) NULL,
        make varchar(80) NULL,
        model varchar(80) NULL,
        year smallint NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_vehicles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_vehicles_fleet FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE SET NULL,
        CONSTRAINT ck_vehicles_status CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')),
        CONSTRAINT ck_vehicles_year CHECK (year IS NULL OR year BETWEEN 1900 AND 2200)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_vehicles_organization_id ON vehicles (organization_id)');
    await queryRunner.query('CREATE INDEX idx_vehicles_fleet_id ON vehicles (fleet_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_vehicles_organization_plate ON vehicles (organization_id, plate_number) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        device_uid varchar(160) NOT NULL,
        driver_id uuid NULL,
        vehicle_id uuid NULL,
        platform varchar(40) NOT NULL DEFAULT 'android',
        app_version varchar(40) NULL,
        model_version varchar(80) NULL,
        last_seen_at timestamptz NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_devices_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_devices_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        CONSTRAINT fk_devices_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
        CONSTRAINT ck_devices_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'REVOKED'))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_devices_organization_id ON devices (organization_id)');
    await queryRunner.query('CREATE INDEX idx_devices_driver_id ON devices (driver_id)');
    await queryRunner.query('CREATE INDEX idx_devices_vehicle_id ON devices (vehicle_id)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_devices_device_uid ON devices (device_uid) WHERE deleted_at IS NULL',
    );

    await queryRunner.query(`
      CREATE TABLE assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        driver_id uuid NOT NULL,
        vehicle_id uuid NOT NULL,
        device_id uuid NULL,
        started_at timestamptz NOT NULL,
        ended_at timestamptz NULL,
        status varchar(32) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_assignments_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
        CONSTRAINT ck_assignments_status CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED')),
        CONSTRAINT ck_assignments_time CHECK (ended_at IS NULL OR ended_at >= started_at)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_assignments_organization_id ON assignments (organization_id)');
    await queryRunner.query('CREATE INDEX idx_assignments_driver_id ON assignments (driver_id)');
    await queryRunner.query('CREATE INDEX idx_assignments_vehicle_id ON assignments (vehicle_id)');
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_assignments_active_driver ON assignments (driver_id) WHERE status = 'ACTIVE' AND ended_at IS NULL AND deleted_at IS NULL",
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_assignments_active_vehicle ON assignments (vehicle_id) WHERE status = 'ACTIVE' AND ended_at IS NULL AND deleted_at IS NULL",
    );

    await queryRunner.query(`
      CREATE TABLE trips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        fleet_id uuid NULL,
        driver_id uuid NOT NULL,
        vehicle_id uuid NOT NULL,
        device_id uuid NULL,
        assignment_id uuid NULL,
        client_trip_id uuid NULL,
        started_at timestamptz NULL,
        ended_at timestamptz NULL,
        status varchar(32) NOT NULL DEFAULT 'PLANNED',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL,
        CONSTRAINT fk_trips_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_trips_fleet FOREIGN KEY (fleet_id) REFERENCES fleets(id) ON DELETE SET NULL,
        CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_trips_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_trips_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
        CONSTRAINT fk_trips_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE SET NULL,
        CONSTRAINT ck_trips_status CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
        CONSTRAINT ck_trips_time CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_trips_organization_id ON trips (organization_id)');
    await queryRunner.query('CREATE INDEX idx_trips_driver_id ON trips (driver_id)');
    await queryRunner.query('CREATE INDEX idx_trips_vehicle_id ON trips (vehicle_id)');
    await queryRunner.query('CREATE INDEX idx_trips_started_at ON trips (started_at)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_trips_organization_client_trip_id ON trips (organization_id, client_trip_id) WHERE client_trip_id IS NOT NULL AND deleted_at IS NULL',
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_trips_active_driver ON trips (driver_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL",
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX uq_trips_active_vehicle ON trips (vehicle_id) WHERE status = 'ACTIVE' AND deleted_at IS NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS trips');
    await queryRunner.query('DROP TABLE IF EXISTS assignments');
    await queryRunner.query('DROP TABLE IF EXISTS devices');
    await queryRunner.query('DROP TABLE IF EXISTS vehicles');
    await queryRunner.query('DROP TABLE IF EXISTS drivers');
    await queryRunner.query('DROP TABLE IF EXISTS fleets');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS organizations');
  }
}
