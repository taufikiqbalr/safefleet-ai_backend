import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { UserRole, UserStatus } from '../../../common/enums/domain.enums';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
