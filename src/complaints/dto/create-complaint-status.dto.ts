import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateComplaintStatusDto {
  @ApiProperty({
    example: 'WAITING_SCHOOL_RESPONSE',
    description: 'Kode unik huruf kapital dan underscore',
  })
  @IsString()
  @Length(2, 50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code harus berupa huruf kapital, angka, dan underscore',
  })
  code: string;

  @ApiProperty({ example: 'Menunggu Jawaban Sekolah' })
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({
    example: 'Aduan sedang menunggu jawaban dari pihak sekolah.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 255)
  description?: string;

  @ApiPropertyOptional({ example: '#F59E0B' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;
}
