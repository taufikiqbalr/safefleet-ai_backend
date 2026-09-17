import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../../common/enums/domain.enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST)
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.usersService.list(user.organizationId, query);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.getById(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user, id, dto);
  }
}
