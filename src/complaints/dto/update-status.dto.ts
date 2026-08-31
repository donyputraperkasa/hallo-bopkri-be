import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateStatusDto {
  @ApiPropertyOptional({
    example: '00000000-0000-4000-8000-000000000004',
    description: 'ID (UUID) atau Code status aduan (e.g. NEW, IN_PROGRESS, RESOLVED)',
  })
  @IsOptional()
  @IsString()
  statusId?: string;

  @ApiPropertyOptional({
    description: 'Status code atau ID alternatif',
    example: 'IN_PROGRESS',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Status code alternatif',
    example: 'IN_PROGRESS',
  })
  @IsOptional()
  @IsString()
  statusCode?: string;

  @ApiPropertyOptional({
    description: 'Catatan ini tampil kepada pelapor pada halaman pelacakan',
    example: 'Aduan sedang ditangani oleh bidang terkait.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  publicNote?: string;
}
