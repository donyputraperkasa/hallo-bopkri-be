import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { parseMysqlUrl } from './mysql-config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaMariaDb(
        parseMysqlUrl(config.getOrThrow<string>('DATABASE_URL')),
      ),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
