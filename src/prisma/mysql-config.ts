import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaPg } from '@prisma/adapter-pg';

export function parseMysqlUrl(connectionString: string) {
  const url = new URL(connectionString);
  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error('DATABASE_URL harus menggunakan protokol mysql://.');
  }

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    connectionLimit: 5,
  };
}

export function createPrismaAdapter(connectionString: string) {
  const url = new URL(connectionString);
  if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
    return new PrismaPg({ connectionString });
  }
  return new PrismaMariaDb(parseMysqlUrl(connectionString));
}
