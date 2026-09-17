import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  employeeCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
