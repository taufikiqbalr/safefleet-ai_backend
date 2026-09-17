import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardAlertsQueryDto, LiveFleetQueryDto } from './dto/dashboard-query.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.summary(user.organizationId);
  }

  @Get('live-fleet')
  liveFleet(@CurrentUser() user: AuthenticatedUser, @Query() query: LiveFleetQueryDto) {
    return this.dashboardService.liveFleet(user.organizationId, query);
  }

  @Get('active-alerts')
  activeAlerts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardAlertsQueryDto,
  ) {
    return this.dashboardService.activeAlerts(user.organizationId, query);
  }
}
