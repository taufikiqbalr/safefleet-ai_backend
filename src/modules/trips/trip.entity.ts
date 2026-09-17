import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { TripStatus } from '../../common/enums/domain.enums';
import { AssignmentEntity } from '../assignments/assignment.entity';
import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { FleetEntity } from '../fleets/fleet.entity';
import { OrganizationEntity } from '../organizations/organization.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';

@Entity({ name: 'trips' })
@Index('idx_trips_organization_id', ['organizationId'])
@Index('idx_trips_driver_id', ['driverId'])
@Index('idx_trips_vehicle_id', ['vehicleId'])
@Index('idx_trips_started_at', ['startedAt'])
@Index('uq_trips_organization_client_trip_id', ['organizationId', 'clientTripId'], {
  unique: true,
  where: '"client_trip_id" IS NOT NULL AND "deleted_at" IS NULL',
})
export class TripEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'fleet_id', type: 'uuid', nullable: true })
  fleetId!: string | null;

  @ManyToOne(() => FleetEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fleet_id' })
  fleet!: FleetEntity | null;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => DriverEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverEntity;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => VehicleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: VehicleEntity;

  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId!: string | null;

  @ManyToOne(() => DeviceEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device!: DeviceEntity | null;

  @Column({ name: 'assignment_id', type: 'uuid', nullable: true })
  assignmentId!: string | null;

  @ManyToOne(() => AssignmentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignment_id' })
  assignment!: AssignmentEntity | null;

  @Column({ name: 'client_trip_id', type: 'uuid', nullable: true })
  clientTripId!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 32, default: TripStatus.PLANNED })
  status!: TripStatus;
}
