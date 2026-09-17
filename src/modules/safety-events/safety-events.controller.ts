import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { CreateSafetyEventFeedbackDto } from './dto/create-safety-event-feedback.dto';
import { SafetyEventQueryDto } from './dto/safety-event-query.dto';
import { SafetyEventsService } from './safety-events.service';

@ApiTags('safety-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get(':id/feedback')
  feedback(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.safetyEventsService.listFeedback(user.organizationId, id);
  }

  @Post(':id/feedback')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST)
  addFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSafetyEventFeedbackDto,
  ) {
    return this.safetyEventsService.addFeedback(user.organizationId, id, user.userId, dto);
  }
}
