import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from './mysql-config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: createPrismaAdapter(config.getOrThrow<string>('DATABASE_URL')),
      transactionOptions: {
        maxWait: 15_000,
        timeout: 30_000,
      },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
