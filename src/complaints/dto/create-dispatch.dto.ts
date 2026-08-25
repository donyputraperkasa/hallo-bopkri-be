import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsUUID, IsOptional, MaxLength, IsArray } from "class-validator";

export class CreateDispatchDto {
  @ApiPropertyOptional({ description: "ID admin tujuan (single)" })
  @IsOptional()
  @IsUUID()
  adminId?: string;

  @ApiPropertyOptional({ description: "Daftar ID admin tujuan (multiple)", type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  adminIds?: string[];

  @ApiPropertyOptional({ description: "Catatan/instruksi disposisi" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
