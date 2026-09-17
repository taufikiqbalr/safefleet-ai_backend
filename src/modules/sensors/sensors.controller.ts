import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentDevice } from '../../common/auth/current-device.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { SensorBatchDto } from './dto/sensor-batch.dto';
import { SensorQueryDto } from './dto/sensor-query.dto';
import { SensorsService } from './sensors.service';

@ApiTags('device-ingestion')
@ApiHeader({ name: 'X-SafeFleet-Device-Id', required: true })
@ApiHeader({ name: 'X-SafeFleet-Device-Key', required: true })
@UseGuards(DeviceAuthGuard)
@Controller('device/sensor-readings')
export class DeviceSensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post('batch')
  ingestBatch(@CurrentDevice() device: AuthenticatedDevice, @Body() dto: SensorBatchDto) {
    return this.sensorsService.ingestBatch(device, dto);
  }
}

@ApiTags('sensor-readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sensor-readings')
export class SensorReadingsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SensorQueryDto) {
    return this.sensorsService.list(user.organizationId, query);
  }
}
