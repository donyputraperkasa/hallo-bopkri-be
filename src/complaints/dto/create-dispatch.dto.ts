import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateDispatchDto {
  @ApiProperty({ description: 'ID admin tujuan (manager atau director)' })
  @IsUUID()
  adminId: string;

  @ApiPropertyOptional({ description: 'Catatan/instruksi disposisi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
