import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { DeviceStatus } from '../../common/enums/domain.enums';
import { DriverEntity } from '../drivers/driver.entity';
import { VehicleEntity } from '../vehicles/vehicle.entity';
import { DeviceEntity } from './device.entity';
import { DeviceQueryDto } from './dto/device-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity>,
    @InjectRepository(DriverEntity)
    private readonly drivers: Repository<DriverEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicles: Repository<VehicleEntity>,
  ) {}

  async list(organizationId: string, query: DeviceQueryDto) {
    const qb = this.devices
      .createQueryBuilder('device')
      .where('device.organization_id = :organizationId', { organizationId });
    if (query.status) qb.andWhere('device.status = :status', { status: query.status });
    if (query.driverId) qb.andWhere('device.driver_id = :driverId', { driverId: query.driverId });
    if (query.vehicleId) qb.andWhere('device.vehicle_id = :vehicleId', { vehicleId: query.vehicleId });
    qb.orderBy('device.created_at', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<DeviceEntity> {
    const device = await this.devices.findOne({ where: { id, organizationId } });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async register(organizationId: string, dto: RegisterDeviceDto): Promise<DeviceEntity> {
    const deviceUid = dto.deviceUid.trim();
    const existing = await this.devices.findOne({ where: { deviceUid } });
    if (existing) throw new ConflictException('Device UID is already registered');
    await this.assertReferences(organizationId, dto.driverId, dto.vehicleId);

    return this.devices.save(
      this.devices.create({
        organizationId,
        deviceUid,
        driverId: dto.driverId ?? null,
        vehicleId: dto.vehicleId ?? null,
        platform: dto.platform?.trim().toLowerCase() || 'android',
        appVersion: dto.appVersion?.trim() || null,
        modelVersion: dto.modelVersion?.trim() || null,
        status: DeviceStatus.ACTIVE,
        lastSeenAt: null,
        apiKeyHash: null,
        apiKeyHint: null,
        apiKeyIssuedAt: null,
      }),
    );
  }

  async update(organizationId: string, id: string, dto: UpdateDeviceDto): Promise<DeviceEntity> {
    const device = await this.getById(organizationId, id);
    await this.assertReferences(organizationId, dto.driverId, dto.vehicleId);
    if (dto.driverId !== undefined) device.driverId = dto.driverId;
    if (dto.vehicleId !== undefined) device.vehicleId = dto.vehicleId;
    if (dto.appVersion !== undefined) device.appVersion = dto.appVersion.trim() || null;
    if (dto.modelVersion !== undefined) device.modelVersion = dto.modelVersion.trim() || null;
    return this.devices.save(device);
  }

  async rotateCredential(organizationId: string, id: string) {
    const device = await this.getById(organizationId, id);
    if (device.status === DeviceStatus.REVOKED) {
      throw new ConflictException('Cannot issue credentials for a revoked device');
    }

    const deviceKey = randomBytes(32).toString('base64url');
    const issuedAt = new Date();
    device.apiKeyHash = await hash(deviceKey, 12);
    device.apiKeyHint = deviceKey.slice(-8);
    device.apiKeyIssuedAt = issuedAt;
    await this.devices.save(device);

    return {
      deviceId: device.id,
      deviceUid: device.deviceUid,
      deviceKey,
      keyHint: device.apiKeyHint,
      issuedAt,
    };
  }

  async authenticateCredential(deviceId: string, deviceKey: string): Promise<DeviceEntity> {
    const device = await this.devices
      .createQueryBuilder('device')
      .addSelect('device.apiKeyHash')
      .where('device.id = :deviceId', { deviceId })
      .andWhere('device.deleted_at IS NULL')
      .getOne();

    if (!device || device.status !== DeviceStatus.ACTIVE || !device.apiKeyHash) {
      throw new UnauthorizedException('Invalid or inactive device credential');
    }

    const valid = await compare(deviceKey, device.apiKeyHash);
    if (!valid) throw new UnauthorizedException('Invalid or inactive device credential');
    return device;
  }

  async touchDevice(
    deviceId: string,
    metadata?: { appVersion?: string; modelVersion?: string },
  ): Promise<void> {
    const patch: Partial<DeviceEntity> = { lastSeenAt: new Date() };
    if (metadata?.appVersion) patch.appVersion = metadata.appVersion.trim();
    if (metadata?.modelVersion) patch.modelVersion = metadata.modelVersion.trim();
    await this.devices.update({ id: deviceId }, patch);
  }

  async revoke(organizationId: string, id: string): Promise<DeviceEntity> {
    const device = await this.getById(organizationId, id);
    device.status = DeviceStatus.REVOKED;
    device.apiKeyHash = null;
    device.apiKeyHint = null;
    device.apiKeyIssuedAt = null;
    return this.devices.save(device);
  }

  private async assertReferences(
    organizationId: string,
    driverId?: string,
    vehicleId?: string,
  ): Promise<void> {
    if (driverId) {
      const driver = await this.drivers.findOne({ where: { id: driverId, organizationId } });
      if (!driver) throw new NotFoundException('Driver not found in this organization');
    }
    if (vehicleId) {
      const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, organizationId } });
      if (!vehicle) throw new NotFoundException('Vehicle not found in this organization');
    }
  }
}
