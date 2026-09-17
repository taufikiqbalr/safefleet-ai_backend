import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SafetyEventQueryDto } from './dto/safety-event-query.dto';
import { SafetyEventsService } from './safety-events.service';

@ApiTags('safety-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('safety-events')
export class SafetyEventsController {
  constructor(private readonly safetyEventsService: SafetyEventsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: SafetyEventQueryDto) {
    return this.safetyEventsService.list(user.organizationId, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.safetyEventsService.getById(user.organizationId, id);
  }
}
