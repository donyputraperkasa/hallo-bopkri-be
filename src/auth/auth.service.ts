import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });
    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Username atau password salah.');
    }

    return {
      accessToken: await this.jwt.signAsync({
        sub: admin.id,
        username: admin.username,
        role: admin.role,
        bidang: admin.bidang ?? null,
        displayName: admin.displayName ?? admin.username,
      }),
      tokenType: 'Bearer',
      role: admin.role,
      bidang: admin.bidang ?? null,
      displayName: admin.displayName ?? admin.username,
    };
  }
}
