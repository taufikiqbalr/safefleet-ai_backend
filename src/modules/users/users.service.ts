import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user.interface';
import { PaginationQueryDto, toPaginatedResult } from '../../common/dto/pagination-query.dto';
import { UserRole, UserStatus } from '../../common/enums/domain.enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async list(organizationId: string, query: PaginationQueryDto) {
    const [items, total] = await this.users.findAndCount({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return toPaginatedResult(items, total, query.page, query.limit);
  }

  async getById(organizationId: string, id: string): Promise<UserEntity> {
    const user = await this.users.findOne({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(currentUser: AuthenticatedUser, dto: CreateUserDto): Promise<UserEntity> {
    if (currentUser.role !== UserRole.OWNER && dto.role === UserRole.OWNER) {
      throw new ForbiddenException('Only an owner can create another owner');
    }

    const email = dto.email.trim().toLowerCase();
    const exists = await this.users.findOne({
      where: { organizationId: currentUser.organizationId, email },
    });
    if (exists) throw new ConflictException('A user with this email already exists');

    const user = this.users.create({
      organizationId: currentUser.organizationId,
      email,
      fullName: dto.fullName.trim(),
      role: dto.role,
      status: UserStatus.ACTIVE,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });
    return this.users.save(user);
  }

  async update(
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserEntity> {
    const target = await this.getById(currentUser.organizationId, id);

    if (currentUser.role !== UserRole.OWNER && (target.role === UserRole.OWNER || dto.role === UserRole.OWNER)) {
      throw new ForbiddenException('Only an owner can modify owner accounts');
    }

    if (target.id === currentUser.userId && dto.status === UserStatus.DISABLED) {
      throw new ForbiddenException('You cannot disable your own account');
    }

    if (dto.fullName !== undefined) target.fullName = dto.fullName.trim();
    if (dto.role !== undefined) target.role = dto.role;
    if (dto.status !== undefined) target.status = dto.status;
    return this.users.save(target);
  }
}
