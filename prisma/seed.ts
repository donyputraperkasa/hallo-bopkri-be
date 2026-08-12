import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { parseMysqlUrl } from '../src/prisma/mysql-config';

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi untuk seed.',
    );
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD minimal 10 karakter.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(parseMysqlUrl(process.env.DATABASE_URL!)),
  });
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  const defaultStatuses = [
    {
      code: 'NEW',
      name: 'Aduan Baru',
      description: 'Aduan telah diterima dan menunggu verifikasi.',
      color: '#3B82F6',
      sortOrder: 1,
      isFinal: false,
    },
    {
      code: 'VERIFIED',
      name: 'Terverifikasi',
      description: 'Aduan telah diverifikasi oleh admin.',
      color: '#06B6D4',
      sortOrder: 2,
      isFinal: false,
    },
    {
      code: 'FORWARDED',
      name: 'Diteruskan',
      description: 'Aduan telah diteruskan kepada bidang terkait.',
      color: '#8B5CF6',
      sortOrder: 3,
      isFinal: false,
    },
    {
      code: 'IN_PROGRESS',
      name: 'Sedang Diproses',
      description: 'Aduan sedang ditindaklanjuti.',
      color: '#F59E0B',
      sortOrder: 4,
      isFinal: false,
    },
    {
      code: 'RESOLVED',
      name: 'Selesai',
      description: 'Penanganan aduan telah selesai.',
      color: '#10B981',
      sortOrder: 5,
      isFinal: true,
    },
    {
      code: 'REJECTED',
      name: 'Ditolak',
      description: 'Aduan tidak dapat ditindaklanjuti.',
      color: '#EF4444',
      sortOrder: 6,
      isFinal: true,
    },
  ];

  for (const status of defaultStatuses) {
    await prisma.complaintStatus.upsert({
      where: { code: status.code },
      update: {},
      create: status,
    });
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
