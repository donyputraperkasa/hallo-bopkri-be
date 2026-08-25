import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ComplaintCategory, Role } from '@prisma/client';

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  const mockPrisma = {
    complaint: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    complaintStatus: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    complaintHistory: {
      create: jest.fn(),
    },
    complaintAttachment: {
      findUnique: jest.fn(),
    },
    complaintDispatch: {
      create: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    admin: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cbOrPromises) => {
      if (Array.isArray(cbOrPromises)) {
        return Promise.all(cbOrPromises);
      }
      return cbOrPromises(mockPrisma);
    }),
  };

  const mockNotifications = {
    notifyNewComplaint: jest.fn().mockResolvedValue(undefined),
    notifyStatusChanged: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ComplaintsService>(ComplaintsService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create complaint with tags', async () => {
      const createdComplaint = {
        id: 'uuid-1',
        ticketCode: 'ADU-202608-ABCDEF1234',
        category: ComplaintCategory.COMPLAINT,
        reporterName: 'Budi',
        contact: '081234567890',
        content: 'Isi laporan panjang lebih dari 10 karakter',
        tags: 'pendidikan,keuangan',
        status: { id: 'status-new', code: 'NEW', name: 'Aduan Baru' },
        createdAt: new Date(),
      };

      mockPrisma.complaint.create.mockResolvedValue(createdComplaint);

      const result = await service.create({
        category: ComplaintCategory.COMPLAINT,
        reporterName: 'Budi',
        contact: '081234567890',
        content: 'Isi laporan panjang lebih dari 10 karakter',
        tags: 'pendidikan,keuangan',
      });

      expect(result.ticketCode).toBe(createdComplaint.ticketCode);
      expect(result.category).toBe(ComplaintCategory.COMPLAINT);
      expect(mockNotifications.notifyNewComplaint).toHaveBeenCalledWith(createdComplaint);
    });

    it('should fallback to tag if tags is not set', async () => {
      const createdComplaint = {
        id: 'uuid-2',
        ticketCode: 'ADU-202608-ABCDEF1235',
        category: ComplaintCategory.QUESTION,
        content: 'Pertanyaan seputar pendaftaran',
        tags: 'pendidikan',
        status: { id: 'status-new', code: 'NEW', name: 'Aduan Baru' },
        createdAt: new Date(),
      };

      mockPrisma.complaint.create.mockResolvedValue(createdComplaint);

      const result = await service.create({
        category: ComplaintCategory.QUESTION,
        content: 'Pertanyaan seputar pendaftaran',
        tag: 'pendidikan',
      });

      expect(result.ticketCode).toBe(createdComplaint.ticketCode);
      expect(mockPrisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: 'pendidikan',
          }),
        }),
      );
    });
  });

  describe('track', () => {
    it('should return complaint track info if found', async () => {
      const mockResult = {
        ticketCode: 'ADU-202608-ABCDEF',
        category: ComplaintCategory.COMPLAINT,
        tags: 'pendidikan',
        status: { id: '1', code: 'NEW', name: 'Baru' },
        createdAt: new Date(),
        updatedAt: new Date(),
        histories: [],
      };
      mockPrisma.complaint.findUnique.mockResolvedValue(mockResult);

      const result = await service.track('ADU-202608-ABCDEF');
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue(null);
      await expect(service.track('NOT-FOUND')).rejects.toThrow(NotFoundException);
    });
  });

  describe('list and listDispatched', () => {
    it('should list complaints with pagination and tag filter', async () => {
      const mockItems = [{ id: '1', ticketCode: 'ADU-1', tags: 'pendidikan' }];
      mockPrisma.complaint.findMany.mockResolvedValue(mockItems);
      mockPrisma.complaint.count.mockResolvedValue(1);

      const result = await service.list({ page: 1, limit: 10, tag: 'pendidikan' });
      expect(result.data).toEqual(mockItems);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list in listDispatched if no dispatches for manager', async () => {
      mockPrisma.complaintDispatch.findMany.mockResolvedValue([]);
      const result = await service.listDispatched('manager-id', { page: 1, limit: 10 });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should return dispatched complaints for manager', async () => {
      mockPrisma.complaintDispatch.findMany.mockResolvedValue([{ complaintId: 'comp-1' }]);
      mockPrisma.complaint.findMany.mockResolvedValue([{ id: 'comp-1', ticketCode: 'ADU-1' }]);
      mockPrisma.complaint.count.mockResolvedValue(1);

      const result = await service.listDispatched('manager-id', { page: 1, limit: 10 });
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('dispatch and getDispatches', () => {
    it('should dispatch complaint successfully with single admin', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({ id: 'comp-1', tags: 'pendidikan' });
      mockPrisma.admin.findMany.mockResolvedValue([{ id: 'admin-mgr', role: Role.manager, bidang: 'pendidikan' }]);
      mockPrisma.complaintDispatch.upsert.mockResolvedValue({
        id: 'disp-1',
        complaintId: 'comp-1',
        adminId: 'admin-mgr',
        note: 'Tolong ditindaklanjuti',
      });

      const res = await service.dispatch('comp-1', {
        adminId: 'admin-mgr',
        note: 'Tolong ditindaklanjuti',
      });
      expect(res.message).toContain('berhasil didisposisikan');
    });

    it('should dispatch complaint successfully with multiple admins', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({ id: 'comp-1', tags: 'pendidikan' });
      mockPrisma.admin.findMany.mockResolvedValue([
        { id: 'admin-mgr-1', role: Role.manager, bidang: 'pendidikan' },
        { id: 'admin-mgr-2', role: Role.manager, bidang: 'keuangan' },
      ]);
      mockPrisma.complaintDispatch.upsert.mockResolvedValue({
        id: 'disp-1',
        complaintId: 'comp-1',
        adminId: 'admin-mgr-1',
      });
      mockPrisma.complaint.update.mockResolvedValue({});

      const res = await service.dispatch('comp-1', {
        adminIds: ['admin-mgr-1', 'admin-mgr-2'],
        note: 'Koordinasi dua bidang',
      });
      expect(res.message).toContain('2 penerima');
    });

    it('should throw ConflictException on single duplicate dispatch if upsert throws', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({ id: 'comp-1' });
      mockPrisma.admin.findMany.mockResolvedValue([{ id: 'admin-mgr', role: Role.manager }]);
      const error: any = new Error('Unique constraint');
      error.code = 'P2002';
      mockPrisma.complaintDispatch.upsert.mockRejectedValue(error);

      await expect(
        service.dispatch('comp-1', { adminId: 'admin-mgr' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
