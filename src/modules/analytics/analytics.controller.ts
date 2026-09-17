import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRangeQueryDto, AnalyticsTrendQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsRangeQueryDto) {
    return this.analyticsService.overview(user.organizationId, query);
  }

  @Get('trends')
  trends(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsTrendQueryDto) {
    return this.analyticsService.trends(user.organizationId, query);
  }

  @Get('models')
  models(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsRangeQueryDto) {
    return this.analyticsService.models(user.organizationId, query);
  }

  @Get('latency')
  latency(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsRangeQueryDto) {
    return this.analyticsService.latency(user.organizationId, query);
  }
}
