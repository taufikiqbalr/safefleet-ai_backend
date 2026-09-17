import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { CreateFleetDto } from './dto/create-fleet.dto';
import { FleetQueryDto } from './dto/fleet-query.dto';
import { UpdateFleetDto } from './dto/update-fleet.dto';
import { FleetsService } from './fleets.service';

@ApiTags('fleets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fleets')
export class FleetsController {
  constructor(private readonly fleetsService: FleetsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: FleetQueryDto) {
    return this.fleetsService.list(user.organizationId, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fleetsService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFleetDto) {
    return this.fleetsService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFleetDto) {
    return this.fleetsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fleetsService.remove(user.organizationId, id);
  }
}
