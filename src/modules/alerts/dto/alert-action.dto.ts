import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AlertActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
