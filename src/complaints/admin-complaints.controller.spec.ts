import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdminComplaintsController } from './admin-complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ReportExportService } from './report-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

describe('AdminComplaintsController', () => {
  let controller: AdminComplaintsController;
  let service: ComplaintsService;
  let prisma: PrismaService;

  const mockComplaintsService = {
    dashboard: jest.fn().mockResolvedValue({ total: 10, byStatus: [], byCategory: [] }),
    list: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    listDispatched: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    detail: jest.fn().mockResolvedValue({ id: 'comp-1', ticketCode: 'ADU-1' }),
    updateStatus: jest.fn().mockResolvedValue({ id: 'comp-1', status: { name: 'Diproses' } }),
    dispatch: jest.fn().mockResolvedValue({ message: 'Disposisi berhasil' }),
    getDispatches: jest.fn().mockResolvedValue([]),
    exportRows: jest.fn().mockResolvedValue([]),
    exportDispatchedRows: jest.fn().mockResolvedValue([]),
  };

  const mockPrisma = {
    admin: { findMany: jest.fn().mockResolvedValue([]) },
    complaintDispatch: { findFirst: jest.fn() },
  };

  const mockReportExport = {
    toExcel: jest.fn().mockResolvedValue(Buffer.from('excel')),
    toPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminComplaintsController],
      providers: [
        { provide: ComplaintsService, useValue: mockComplaintsService },
        { provide: ReportExportService, useValue: mockReportExport },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
      ],
    }).compile();

    controller = module.get<AdminComplaintsController>(AdminComplaintsController);
    service = module.get<ComplaintsService>(ComplaintsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should call list for OWNER', async () => {
      const req: any = { admin: { sub: 'owner-1', role: Role.owner } };
      await controller.list({ page: 1, limit: 10 } as any, req);
      expect(service.list).toHaveBeenCalled();
      expect(service.listDispatched).not.toHaveBeenCalled();
    });

    it('should call list for DIRECTOR (sees all complaints directly)', async () => {
      const req: any = { admin: { sub: 'dir-1', role: Role.director } };
      await controller.list({ page: 1, limit: 10 } as any, req);
      expect(service.list).toHaveBeenCalled();
      expect(service.listDispatched).not.toHaveBeenCalled();
    });

    it('should call listDispatched for MANAGER', async () => {
      const req: any = { admin: { sub: 'mgr-1', role: Role.manager } };
      await controller.list({ page: 1, limit: 10 } as any, req);
      expect(service.listDispatched).toHaveBeenCalledWith('mgr-1', { page: 1, limit: 10 });
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('should allow OWNER to see detail without dispatch check', async () => {
      const req: any = { admin: { sub: 'owner-1', role: Role.owner } };
      const res = await controller.detail('comp-1', req);
      expect(res.id).toBe('comp-1');
      expect(prisma.complaintDispatch.findFirst).not.toHaveBeenCalled();
    });

    it('should allow DIRECTOR to see detail without dispatch check', async () => {
      const req: any = { admin: { sub: 'dir-1', role: Role.director } };
      const res = await controller.detail('comp-1', req);
      expect(res.id).toBe('comp-1');
      expect(prisma.complaintDispatch.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if MANAGER tries to see non-dispatched complaint', async () => {
      const req: any = { admin: { sub: 'mgr-1', role: Role.manager } };
      jest.spyOn(prisma.complaintDispatch, 'findFirst').mockResolvedValue(null);

      await expect(controller.detail('comp-1', req)).rejects.toThrow(ForbiddenException);
    });

    it('should allow MANAGER if complaint is dispatched to them', async () => {
      const req: any = { admin: { sub: 'mgr-1', role: Role.manager } };
      jest.spyOn(prisma.complaintDispatch, 'findFirst').mockResolvedValue({ id: 'disp-1' } as any);

      const res = await controller.detail('comp-1', req);
      expect(res.id).toBe('comp-1');
    });
  });

  describe('dispatch', () => {
    it('should allow OWNER to dispatch', async () => {
      const req: any = { admin: { sub: 'owner-1', role: Role.owner } };
      await controller.dispatch('comp-1', { adminId: 'mgr-1' }, req);
      expect(service.dispatch).toHaveBeenCalledWith('comp-1', { adminId: 'mgr-1' });
    });

    it('should reject non-owner from dispatching', () => {
      const reqDir: any = { admin: { sub: 'dir-1', role: Role.director } };
      expect(() => controller.dispatch('comp-1', { adminId: 'mgr-1' }, reqDir)).toThrow(
        ForbiddenException,
      );

      const reqMgr: any = { admin: { sub: 'mgr-1', role: Role.manager } };
      expect(() => controller.dispatch('comp-1', { adminId: 'dir-1' }, reqMgr)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should prevent DIRECTOR from updating status (read-only)', async () => {
      const req: any = { admin: { sub: 'dir-1', role: Role.director } };
      await expect(
        controller.updateStatus('comp-1', { statusId: 'stat-1' }, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER to update status', async () => {
      const req: any = { admin: { sub: 'owner-1', role: Role.owner } };
      await controller.updateStatus('comp-1', { statusId: 'stat-1' }, req);
      expect(service.updateStatus).toHaveBeenCalled();
    });

    it('should support POST method for updateStatus', async () => {
      const req: any = { admin: { sub: 'owner-1', role: Role.owner } };
      await controller.updateStatusPost('comp-1', { statusId: 'stat-1' }, req);
      expect(service.updateStatus).toHaveBeenCalled();
    });
  });
});
