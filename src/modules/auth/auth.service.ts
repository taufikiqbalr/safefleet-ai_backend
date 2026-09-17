import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { OrganizationStatus, UserStatus } from '../../common/enums/domain.enums';
import { OrganizationEntity } from '../organizations/organization.entity';
import { UserEntity } from '../users/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizations: Repository<OrganizationEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const organization = await this.organizations.findOne({
      where: {
        slug: dto.organizationSlug.trim().toLowerCase(),
        status: OrganizationStatus.ACTIVE,
      },
    });

    if (!organization) {
      throw new UnauthorizedException('Invalid organization, email, or password');
    }

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('LOWER(user.email) = LOWER(:email)', { email: dto.email.trim() })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .getOne();

    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid organization, email, or password');
    }

    const expiresIn = this.config.get<number>('JWT_EXPIRES_SECONDS', 28800);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      },
      { expiresIn },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
      },
    };
  }

  async me(currentUser: AuthenticatedUser) {
    const user = await this.users.findOne({
      where: { id: currentUser.userId, organizationId: currentUser.organizationId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }

  async changePassword(currentUser: AuthenticatedUser, dto: ChangePasswordDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: currentUser.userId })
      .andWhere('user.organizationId = :organizationId', {
        organizationId: currentUser.organizationId,
      })
      .getOne();

    if (!user?.passwordHash || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.users.save(user);

    return { changed: true };
  }
}
