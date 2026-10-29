import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';

export interface AdminAccountSeedConfig {
  username: string;
  password: string;
  role: Role;
  bidang: string | null;
  displayName: string;
}

export function reloadEnvFile(): NodeJS.ProcessEnv {
  dotenv.config({ override: true, quiet: true });
  return process.env;
}

export function getAdminAccountsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AdminAccountSeedConfig[] {
  const accounts: AdminAccountSeedConfig[] = [];

  const ownerUsername = env.ADMIN_USERNAME?.trim();
  const ownerPassword = env.ADMIN_PASSWORD;
  if (ownerUsername && ownerPassword) {
    accounts.push({
      username: ownerUsername,
      password: ownerPassword,
      role: Role.owner,
      bidang: null,
      displayName: 'Owner BOPKRI',
    });
  }

  const directorUsername = (env.DIRECTOR_USERNAME ?? 'director').trim();
  const directorPassword = env.DIRECTOR_PASSWORD;
  if (directorUsername && directorPassword) {
    accounts.push({
      username: directorUsername,
      password: directorPassword,
      role: Role.director,
      bidang: null,
      displayName: 'Direktur BOPKRI',
    });
  }

  const defaultManagerPassword = env.MANAGER_PASSWORD;

  const managerDefinitions = [
    {
      usernameEnv: 'PENDIDIKAN_USERNAME',
      defaultUsername: 'pendidikan',
      passwordEnv: 'PENDIDIKAN_PASSWORD',
      bidang: 'pendidikan',
      displayName: 'Manajer Bidang Pendidikan',
    },
    {
      usernameEnv: 'KEUANGAN_USERNAME',
      defaultUsername: 'keuangan',
      passwordEnv: 'KEUANGAN_PASSWORD',
      bidang: 'keuangan',
      displayName: 'Manajer Bidang Keuangan',
    },
    {
      usernameEnv: 'PSDM_USERNAME',
      defaultUsername: 'psdm',
      passwordEnv: 'PSDM_PASSWORD',
      bidang: 'PSDM',
      displayName: 'Manajer Bidang PSDM',
    },
    {
      usernameEnv: 'HUMAS_USERNAME',
      defaultUsername: 'humas',
      passwordEnv: 'HUMAS_PASSWORD',
      bidang: 'humas',
      displayName: 'Manajer Bidang Humas',
    },
    {
      usernameEnv: 'ASSET_USERNAME',
      defaultUsername: 'asset',
      passwordEnv: 'ASSET_PASSWORD',
      bidang: 'asset',
      displayName: 'Manajer Bidang Asset & Sarpras',
    },
    {
      usernameEnv: 'LAINNYA_USERNAME',
      defaultUsername: 'lainnya',
      passwordEnv: 'LAINNYA_PASSWORD',
      bidang: 'lainnya',
      displayName: 'Manajer Bidang Umum & Lainnya',
    },
  ];

  for (const def of managerDefinitions) {
    const username = (env[def.usernameEnv] ?? def.defaultUsername).trim();
    const password = env[def.passwordEnv] || defaultManagerPassword;

    if (username && password) {
      accounts.push({
        username,
        password,
        role: Role.manager,
        bidang: def.bidang,
        displayName: def.displayName,
      });
    }
  }

  return accounts;
}

export async function syncSingleAdminAccount(
  prisma: Pick<PrismaClient, 'admin'>,
  acc: AdminAccountSeedConfig,
) {
  const existingByUsername = await prisma.admin.findUnique({
    where: { username: acc.username },
  });

  const existingBySlot = await prisma.admin.findFirst({
    where:
      acc.role === Role.manager
        ? { role: Role.manager, bidang: acc.bidang }
        : { role: acc.role },
  });

  const target = existingByUsername ?? existingBySlot;

  if (target) {
    const isSamePassword = await bcrypt.compare(
      acc.password,
      target.passwordHash,
    );
    const isSameMeta =
      target.username === acc.username &&
      target.role === acc.role &&
      target.bidang === acc.bidang &&
      target.displayName === acc.displayName;

    if (isSamePassword && isSameMeta) {
      return target;
    }

    const passwordHash = isSamePassword
      ? target.passwordHash
      : await bcrypt.hash(acc.password, 12);

    // Jika target dari slot berbeda dengan row lain yang kebetulan memakai username yang sama
    if (
      existingByUsername &&
      existingBySlot &&
      existingByUsername.id !== existingBySlot.id
    ) {
      return prisma.admin.update({
        where: { id: existingByUsername.id },
        data: {
          passwordHash,
          role: acc.role,
          bidang: acc.bidang,
          displayName: acc.displayName,
        },
      });
    }

    return prisma.admin.update({
      where: { id: target.id },
      data: {
        username: acc.username,
        passwordHash,
        role: acc.role,
        bidang: acc.bidang,
        displayName: acc.displayName,
      },
    });
  }

  const passwordHash = await bcrypt.hash(acc.password, 12);
  return prisma.admin.create({
    data: {
      username: acc.username,
      passwordHash,
      role: acc.role,
      bidang: acc.bidang,
      displayName: acc.displayName,
    },
  });
}

export async function syncAdminAccounts(
  prisma: Pick<PrismaClient, 'admin'>,
  accounts: AdminAccountSeedConfig[],
) {
  for (const acc of accounts) {
    await syncSingleAdminAccount(prisma, acc);
  }
}
