import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { StartTripDto } from './dto/start-trip.dto';
import { TripQueryDto } from './dto/trip-query.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: TripQueryDto) {
    return this.tripsService.list(user.organizationId, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.getById(user.organizationId, id);
  }

  @Post('start')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  start(@CurrentUser() user: AuthenticatedUser, @Body() dto: StartTripDto) {
    return this.tripsService.start(user.organizationId, dto);
  }

  @Post(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.complete(user.organizationId, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.cancel(user.organizationId, id);
  }
}
