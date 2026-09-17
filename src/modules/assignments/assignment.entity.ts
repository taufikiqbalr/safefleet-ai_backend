import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { AssignmentStatus } from '../../common/enums/domain.enums';
import { DeviceEntity } from '../devices/device.entity';
import { DriverEntity } from '../drivers/driver.entity';
import { OrganizationEntity } from '../organizations/organization.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';

@Entity({ name: 'assignments' })
@Index('idx_assignments_organization_id', ['organizationId'])
@Index('idx_assignments_driver_id', ['driverId'])
@Index('idx_assignments_vehicle_id', ['vehicleId'])
export class AssignmentEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

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

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 32, default: AssignmentStatus.ACTIVE })
  status!: AssignmentStatus;
}
