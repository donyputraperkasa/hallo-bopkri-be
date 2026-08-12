import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ enum: ComplaintCategory, example: 'COMPLAINT' })
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @ApiPropertyOptional({ example: 'Budi Santoso' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  reporterName?: string;

  @ApiPropertyOptional({
    description: 'Nomor WhatsApp atau email',
    example: '081234567890',
  })
  @IsOptional()
  @IsString()
  @Length(6, 150)
  @Matches(/^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9][0-9\s-]{5,19})$/, {
    message: 'contact harus berupa email atau nomor telepon yang valid',
  })
  contact?: string;

  @ApiProperty({ example: 'Saya ingin menyampaikan bahwa ...' })
  @IsString()
  @Length(10, 5000)
  content: string;

  @ApiPropertyOptional({
    description:
      'Maksimal 3 file JPG, PNG, atau PDF; masing-masing maksimal 5 MB',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  @IsOptional()
  attachments?: string[];
}
