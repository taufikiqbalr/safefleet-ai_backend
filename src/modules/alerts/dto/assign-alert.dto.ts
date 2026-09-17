import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignAlertDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
