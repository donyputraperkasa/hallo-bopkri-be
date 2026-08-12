import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({
    example: '00000000-0000-4000-8000-000000000004',
    description: 'ID dari master complaint status',
  })
  @IsUUID()
  statusId: string;

  @ApiPropertyOptional({
    description: 'Catatan ini tampil kepada pelapor pada halaman pelacakan',
    example: 'Aduan sedang ditangani oleh bidang terkait.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  publicNote?: string;
}
