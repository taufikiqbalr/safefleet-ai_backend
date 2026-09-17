import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/enums/domain.enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getCurrent(user.organizationId);
  }

  @Patch('current')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateCurrent(user.organizationId, dto);
  }
}
