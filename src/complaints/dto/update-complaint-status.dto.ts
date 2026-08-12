import { PartialType, PickType } from '@nestjs/swagger';
import { CreateComplaintStatusDto } from './create-complaint-status.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateComplaintStatusDto extends PartialType(
  PickType(CreateComplaintStatusDto, [
    'name',
    'description',
    'color',
    'sortOrder',
    'isFinal',
  ] as const),
) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
