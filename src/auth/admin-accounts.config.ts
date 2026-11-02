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
      usernameEnvs: ['PENDIDIKAN_USERNAME', 'MGR_PENDIDIKAN_USERNAME'],
      defaultUsername: 'pendidikan',
      passwordEnvs: ['PENDIDIKAN_PASSWORD', 'MGR_PENDIDIKAN_PASSWORD'],
      bidang: 'pendidikan',
      displayName: 'Manajer Bidang Pendidikan',
    },
    {
      usernameEnvs: ['KEUANGAN_USERNAME', 'MGR_KEUANGAN_USERNAME'],
      defaultUsername: 'keuangan',
      passwordEnvs: ['KEUANGAN_PASSWORD', 'MGR_KEUANGAN_PASSWORD'],
      bidang: 'keuangan',
      displayName: 'Manajer Bidang Keuangan',
    },
    {
      usernameEnvs: ['PSDM_USERNAME', 'MGR_PSDM_USERNAME'],
      defaultUsername: 'psdm',
      passwordEnvs: ['PSDM_PASSWORD', 'MGR_PSDM_PASSWORD'],
      bidang: 'PSDM',
      displayName: 'Manajer Bidang PSDM',
    },
    {
      usernameEnvs: ['HUMAS_USERNAME', 'MGR_HUMAS_USERNAME'],
      defaultUsername: 'humas',
      passwordEnvs: ['HUMAS_PASSWORD', 'MGR_HUMAS_PASSWORD'],
      bidang: 'humas',
      displayName: 'Manajer Bidang Humas',
    },
    {
      usernameEnvs: ['ASSET_USERNAME', 'MGR_ASSET_USERNAME'],
      defaultUsername: 'asset',
      passwordEnvs: ['ASSET_PASSWORD', 'MGR_ASSET_PASSWORD'],
      bidang: 'asset',
      displayName: 'Manajer Bidang Asset & Sarpras',
    },
    {
      usernameEnvs: ['LAINNYA_USERNAME', 'MGR_LAINNYA_USERNAME'],
      defaultUsername: 'mgr_lainnya',
      passwordEnvs: ['LAINNYA_PASSWORD', 'MGR_LAINNYA_PASSWORD'],
      bidang: 'lainnya',
      displayName: 'Manajer Bidang Umum & Lainnya',
    },
  ];

  for (const def of managerDefinitions) {
    const rawUsername = def.usernameEnvs
      .map((key) => env[key]?.trim())
      .find(Boolean);
    const rawPassword = def.passwordEnvs
      .map((key) => env[key])
      .find((val) => Boolean(val && val.length > 0));

    const username = rawUsername ?? def.defaultUsername;
    const password = rawPassword || defaultManagerPassword;

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
