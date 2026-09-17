import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { CurrentDevice } from '../../common/auth/current-device.decorator';
import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('device-ingestion')
@ApiHeader({ name: 'X-SafeFleet-Device-Id', required: true })
@ApiHeader({ name: 'X-SafeFleet-Device-Key', required: true })
@UseGuards(DeviceAuthGuard)
@Controller('device/telemetry')
export class DeviceTelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('batch')
  ingestBatch(@CurrentDevice() device: AuthenticatedDevice, @Body() dto: TelemetryBatchDto) {
    return this.telemetryService.ingestBatch(device, dto);
  }
}
