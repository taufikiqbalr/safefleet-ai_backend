import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { DevicesService } from './devices.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { device?: AuthenticatedDevice }>();

    const deviceId = request.header('x-safefleet-device-id')?.trim();
    const deviceKey = request.header('x-safefleet-device-key')?.trim();

    if (!deviceId || !this.isUuid(deviceId) || !deviceKey) {
      throw new UnauthorizedException(
        'Valid X-SafeFleet-Device-Id and X-SafeFleet-Device-Key headers are required',
      );
    }

    const device = await this.devicesService.authenticateCredential(deviceId, deviceKey);
    request.device = {
      deviceId: device.id,
      organizationId: device.organizationId,
      deviceUid: device.deviceUid,
      driverId: device.driverId,
      vehicleId: device.vehicleId,
    };

    return true;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
