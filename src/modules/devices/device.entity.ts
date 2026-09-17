import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { DeviceStatus } from '../../common/enums/domain.enums';
import { DriverEntity } from '../drivers/driver.entity';
import { OrganizationEntity } from '../organizations/organization.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';

@Entity({ name: 'devices' })
@Index('idx_devices_organization_id', ['organizationId'])
@Index('idx_devices_driver_id', ['driverId'])
@Index('idx_devices_vehicle_id', ['vehicleId'])
@Index('uq_devices_device_uid', ['deviceUid'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class DeviceEntity extends AppBaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @Column({ name: 'device_uid', type: 'varchar', length: 160 })
  deviceUid!: string;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => DriverEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverEntity | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => VehicleEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: VehicleEntity | null;

  @Column({ type: 'varchar', length: 40, default: 'android' })
  platform!: string;

  @Column({ name: 'app_version', type: 'varchar', length: 40, nullable: true })
  appVersion!: string | null;

  @Column({ name: 'model_version', type: 'varchar', length: 80, nullable: true })
  modelVersion!: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: 'api_key_hash', type: 'varchar', length: 255, nullable: true, select: false })
  apiKeyHash!: string | null;

  @Column({ name: 'api_key_hint', type: 'varchar', length: 16, nullable: true })
  apiKeyHint!: string | null;

  @Column({ name: 'api_key_issued_at', type: 'timestamptz', nullable: true })
  apiKeyIssuedAt!: Date | null;

  @Column({ type: 'varchar', length: 32, default: DeviceStatus.ACTIVE })
  status!: DeviceStatus;
}
