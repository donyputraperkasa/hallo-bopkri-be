import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty({ example: 'password-rahasia' })
  @IsString()
  @Length(10, 100)
  password: string;
}
