import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { AlertsService } from './alerts.service';
import { AlertActionDto } from './dto/alert-action.dto';
import { AlertQueryDto } from './dto/alert-query.dto';
import { AssignAlertDto } from './dto/assign-alert.dto';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AlertQueryDto) {
    return this.alertsService.list(user.organizationId, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alertsService.getById(user.organizationId, id);
  }

  @Get(':id/history')
  history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alertsService.getHistory(user.organizationId, id);
  }

  @Post(':id/assign')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignAlertDto,
  ) {
    return this.alertsService.assign(user.organizationId, id, dto);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AlertActionDto,
  ) {
    return this.alertsService.acknowledge(user.organizationId, id, user.userId, dto);
  }

  @Post(':id/escalate')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  escalate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AlertActionDto,
  ) {
    return this.alertsService.escalate(user.organizationId, id, user.userId, dto);
  }

  @Post(':id/resolve')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AlertActionDto,
  ) {
    return this.alertsService.resolve(user.organizationId, id, user.userId, dto);
  }
}
