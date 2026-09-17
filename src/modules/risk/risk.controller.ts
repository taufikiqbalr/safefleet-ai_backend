import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { CreateRiskPolicyDto } from './dto/create-risk-policy.dto';
import { RiskPolicyQueryDto } from './dto/risk-policy-query.dto';
import { RiskSnapshotQueryDto } from './dto/risk-snapshot-query.dto';
import { RiskService } from './risk.service';

@ApiTags('risk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('risk-policies')
  listPolicies(@CurrentUser() user: AuthenticatedUser, @Query() query: RiskPolicyQueryDto) {
    return this.riskService.listPolicies(user.organizationId, query);
  }

  @Get('risk-policies/active')
  getActivePolicy(@CurrentUser() user: AuthenticatedUser) {
    return this.riskService.getActivePolicy(user.organizationId);
  }

  @Post('risk-policies')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createPolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRiskPolicyDto) {
    return this.riskService.createPolicy(user.organizationId, dto);
  }

  @Post('risk-policies/:id/activate')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  activatePolicy(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.riskService.activatePolicy(user.organizationId, id);
  }

  @Get('risk-snapshots')
  listSnapshots(@CurrentUser() user: AuthenticatedUser, @Query() query: RiskSnapshotQueryDto) {
    return this.riskService.listSnapshots(user.organizationId, query);
  }
}
