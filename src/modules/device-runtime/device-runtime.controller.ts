import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { CurrentDevice } from '../../common/auth/current-device.decorator';
import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { DeviceRuntimeService } from './device-runtime.service';
import { CompleteDeviceTripDto } from './dto/complete-device-trip.dto';
import { StartDeviceTripDto } from './dto/start-device-trip.dto';

@ApiTags('device-runtime')
@ApiHeader({ name: 'X-SafeFleet-Device-Id', required: true })
@ApiHeader({ name: 'X-SafeFleet-Device-Key', required: true })
@UseGuards(DeviceAuthGuard)
@Controller('device')
export class DeviceRuntimeController {
  constructor(private readonly deviceRuntimeService: DeviceRuntimeService) {}

  @Get('context')
  context(@CurrentDevice() device: AuthenticatedDevice) {
    return this.deviceRuntimeService.getContext(device);
  }

  @Post('trips/start')
  startTrip(
    @CurrentDevice() device: AuthenticatedDevice,
    @Body() dto: StartDeviceTripDto,
  ) {
    return this.deviceRuntimeService.startTrip(device, dto);
  }

  @Post('trips/:id/complete')
  completeTrip(
    @CurrentDevice() device: AuthenticatedDevice,
    @Param('id') id: string,
    @Body() dto: CompleteDeviceTripDto,
  ) {
    return this.deviceRuntimeService.completeTrip(device, id, dto);
  }
}
