import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'ts-node prisma/seed.ts' },
  // Generate client tidak membutuhkan koneksi database. Nilai fallback hanya
  // menjaga `prisma generate` tetap dapat berjalan di CI sebelum .env dibuat.
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'mysql://root@localhost:3306/hallo_bopkri',
  },
});
