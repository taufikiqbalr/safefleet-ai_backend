import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { SafetyEventFeedbackClassification } from '../../../common/enums/domain.enums';

export class CreateSafetyEventFeedbackDto {
  @IsEnum(SafetyEventFeedbackClassification)
  classification!: SafetyEventFeedbackClassification;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
