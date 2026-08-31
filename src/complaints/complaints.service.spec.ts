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
    it('should create complaint with COMPLAINT category and generate ADU prefix', async () => {
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
      expect(mockPrisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketCode: expect.stringMatching(/^ADU-\d{6}-[A-F0-9]{20}$/),
            category: ComplaintCategory.COMPLAINT,
          }),
        }),
      );
      expect(mockNotifications.notifyNewComplaint).toHaveBeenCalledWith(createdComplaint);
    });

    it('should create question with QUESTION category and generate TNY prefix', async () => {
      const createdComplaint = {
        id: 'uuid-2',
        ticketCode: 'TNY-202608-ABCDEF1235',
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
      expect(result.category).toBe(ComplaintCategory.QUESTION);
      expect(mockPrisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketCode: expect.stringMatching(/^TNY-\d{6}-[A-F0-9]{20}$/),
            category: ComplaintCategory.QUESTION,
            tags: 'pendidikan',
          }),
        }),
      );
    });

    it('should create appreciation with APPRECIATION category and generate APR prefix', async () => {
      const createdComplaint = {
        id: 'uuid-3',
        ticketCode: 'APR-202608-ABCDEF1236',
        category: ComplaintCategory.APPRECIATION,
        content: 'Terima kasih atas pelayanannya',
        status: { id: 'status-new', code: 'NEW', name: 'Aduan Baru' },
        createdAt: new Date(),
      };

      mockPrisma.complaint.create.mockResolvedValue(createdComplaint);

      const result = await service.create({
        category: ComplaintCategory.APPRECIATION,
        content: 'Terima kasih atas pelayanannya',
      });

      expect(result.ticketCode).toBe(createdComplaint.ticketCode);
      expect(result.category).toBe(ComplaintCategory.APPRECIATION);
      expect(mockPrisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketCode: expect.stringMatching(/^APR-\d{6}-[A-F0-9]{20}$/),
            category: ComplaintCategory.APPRECIATION,
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

  describe('updateStatus', () => {
    it('should update status by statusId UUID or Code successfully', async () => {
      mockPrisma.complaint.findUnique.mockResolvedValue({
        id: 'comp-1',
        ticketCode: 'ADU-1',
        contact: 'user@example.com',
        status: { id: 'stat-1', name: 'Baru' },
        histories: [],
        attachments: [],
        dispatches: [],
      });
      mockPrisma.complaintStatus.findFirst.mockResolvedValue({
        id: 'stat-2',
        code: 'IN_PROGRESS',
        name: 'Sedang Diproses',
      });
      mockPrisma.complaint.update.mockResolvedValue({
        id: 'comp-1',
        statusId: 'stat-2',
        status: { id: 'stat-2', code: 'IN_PROGRESS', name: 'Sedang Diproses' },
      });
      mockPrisma.complaintHistory.create.mockResolvedValue({});

      const result = await service.updateStatus('comp-1', {
        statusId: 'IN_PROGRESS',
        publicNote: 'Sedang dikerjakan oleh tim',
      });

      expect(result.id).toBe('comp-1');
      expect(mockPrisma.complaintStatus.findFirst).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [{ id: 'IN_PROGRESS' }, { code: 'IN_PROGRESS' }],
        },
      });
      expect(mockNotifications.notifyStatusChanged).toHaveBeenCalled();
    });
  });
});
