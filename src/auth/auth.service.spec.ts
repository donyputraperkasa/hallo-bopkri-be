import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            admin: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate valid user successfully', async () => {
    const passwordHash = await bcrypt.hash('secret1234', 10);
    jest.spyOn(prisma.admin, 'findUnique').mockResolvedValue({
      id: 'admin-123',
      username: 'admin',
      passwordHash,
      role: Role.owner,
      bidang: null,
      displayName: 'Owner BOPKRI',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login({ username: 'admin', password: 'secret1234' });

    expect(result).toEqual({
      accessToken: 'test-jwt-token',
      tokenType: 'Bearer',
      role: Role.owner,
      bidang: null,
      displayName: 'Owner BOPKRI',
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'admin-123',
      username: 'admin',
      role: Role.owner,
      bidang: null,
      displayName: 'Owner BOPKRI',
    });
  });

  it('should throw UnauthorizedException on wrong password', async () => {
    const passwordHash = await bcrypt.hash('secret1234', 10);
    jest.spyOn(prisma.admin, 'findUnique').mockResolvedValue({
      id: 'admin-123',
      username: 'admin',
      passwordHash,
      role: Role.owner,
      bidang: null,
      displayName: 'Owner BOPKRI',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.login({ username: 'admin', password: 'wrongpassword' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when admin not found', async () => {
    jest.spyOn(prisma.admin, 'findUnique').mockResolvedValue(null);

    await expect(
      service.login({ username: 'unknown', password: 'secret1234' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
