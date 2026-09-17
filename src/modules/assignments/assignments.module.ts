import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssignmentEntity } from './assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssignmentEntity])],
  exports: [TypeOrmModule],
})
export class AssignmentsModule {}
