import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { UserRole } from '../../../common/enums/domain.enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole = UserRole.VIEWER;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
