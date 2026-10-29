import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import {
  getAdminAccountsFromEnv,
  reloadEnvFile,
  syncAdminAccounts,
  syncSingleAdminAccount,
} from './admin-accounts.config';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit() {
    try {
      const env = reloadEnvFile();
      const accounts = getAdminAccountsFromEnv(env);
      await syncAdminAccounts(this.prisma, accounts);
      this.logger.log(
        `Berhasil menyinkronkan ${accounts.length} akun admin dari .env`,
      );
    } catch (error) {
      this.logger.warn(
        `Sinkronisasi otomatis akun admin dari .env dilewati: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async login(dto: LoginDto) {
    const inputUsername = dto.username.trim();

    // 1. Cek langsung terhadap konfigurasi terbaru di .env (mendukung perubahan .env tanpa perlu seed ulang)
    const env = reloadEnvFile();
    const envAccounts = getAdminAccountsFromEnv(env);
    const matchedEnvAccount = envAccounts.find(
      (acc) => acc.username === inputUsername,
    );

    if (matchedEnvAccount && dto.password === matchedEnvAccount.password) {
      const syncedAdmin = await syncSingleAdminAccount(
        this.prisma,
        matchedEnvAccount,
      );

      return {
        accessToken: await this.jwt.signAsync({
          sub: syncedAdmin.id,
          username: syncedAdmin.username,
          role: syncedAdmin.role,
          bidang: syncedAdmin.bidang ?? null,
          displayName: syncedAdmin.displayName ?? syncedAdmin.username,
        }),
        tokenType: 'Bearer',
        role: syncedAdmin.role,
        bidang: syncedAdmin.bidang ?? null,
        displayName: syncedAdmin.displayName ?? syncedAdmin.username,
      };
    }

    // 2. Fallback: cek tabel admin di database
    const admin = await this.prisma.admin.findUnique({
      where: { username: inputUsername },
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
