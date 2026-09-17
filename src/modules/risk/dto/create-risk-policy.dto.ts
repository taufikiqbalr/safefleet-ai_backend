import { IsInt, IsObject, IsString, MaxLength, Min } from 'class-validator';

export class CreateRiskPolicyDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsObject()
  config!: Record<string, unknown>;
}
