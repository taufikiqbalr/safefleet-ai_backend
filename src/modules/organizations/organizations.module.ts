import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrganizationEntity } from './organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity])],
  exports: [TypeOrmModule],
})
export class OrganizationsModule {}
