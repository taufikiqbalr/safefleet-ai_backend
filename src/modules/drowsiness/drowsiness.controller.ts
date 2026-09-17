import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';

import { AuthenticatedDevice } from '../../common/auth/authenticated-device.interface';
import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentDevice } from '../../common/auth/current-device.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DeviceAuthGuard } from '../devices/device-auth.guard';
import { DrowsinessService } from './drowsiness.service';
import { DrowsinessBatchDto } from './dto/drowsiness-batch.dto';

@ApiTags('device-ingestion')
@ApiHeader({ name: 'X-SafeFleet-Device-Id', required: true })
@ApiHeader({ name: 'X-SafeFleet-Device-Key', required: true })
@UseGuards(DeviceAuthGuard)
@Controller('device/drowsiness-events')
export class DeviceDrowsinessController {
  constructor(private readonly drowsinessService: DrowsinessService) {}

  @Post('batch')
  ingestBatch(@CurrentDevice() device: AuthenticatedDevice, @Body() dto: DrowsinessBatchDto) {
    return this.drowsinessService.ingestBatch(device, dto);
  }
}

@ApiTags('drowsiness-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drowsiness-events')
export class DrowsinessEventsController {
  constructor(private readonly drowsinessService: DrowsinessService) {}

  @Get(':eventId')
  getDetail(@CurrentUser() user: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.drowsinessService.getDetail(user.organizationId, eventId);
  }
}
