import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { getUploadDirectory } from './attachment.config';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ListComplaintsDto } from './dto/list-complaints.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateComplaintDto, files: Express.Multer.File[] = []) {
    const ticketCode = this.generateTicketCode();
    try {
      const complaint = await this.prisma.complaint.create({
        data: {
          ticketCode,
          category: dto.category,
          reporterName: dto.reporterName?.trim() || null,
          contact: dto.contact?.trim() || null,
          content: dto.content.trim(),
          tags: (dto.tags?.trim() || dto.tag?.trim()) || null,
          status: { connect: { code: 'NEW' } },
          histories: {
            create: {
              status: { connect: { code: 'NEW' } },
              publicNote: 'Aduan telah diterima dan menunggu verifikasi admin.',
            },
          },
          attachments: {
            create: files.map((file) => ({
              originalName: file.originalname,
              storageKey: file.filename,
              mimeType: file.mimetype,
              size: file.size,
            })),
          },
        },
        include: { status: true },
      });

      await this.notifications.notifyNewComplaint(complaint);

      return {
        message: 'Aduan berhasil dikirim. Simpan kode tiket ini.',
        ticketCode: complaint.ticketCode,
        category: complaint.category,
        status: complaint.status,
        createdAt: complaint.createdAt,
        attachmentCount: files.length,
      };
    } catch (error) {
      await Promise.allSettled(files.map((file) => unlink(file.path)));
      throw error;
    }
  }

  async track(ticketCode: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { ticketCode: ticketCode.toUpperCase() },
      select: {
        ticketCode: true,
        category: true,
        tags: true,
        status: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            color: true,
            isFinal: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        histories: {
          orderBy: { createdAt: 'asc' },
          select: {
            status: {
              select: {
                id: true,
                code: true,
                name: true,
                color: true,
                isFinal: true,
              },
            },
            publicNote: true,
            createdAt: true,
          },
        },
      },
    });
    if (!complaint) throw new NotFoundException('Kode tiket tidak ditemukan.');
    return complaint;
  }

  async list(query: ListComplaintsDto) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketCode: true,
          category: true,
          reporterName: true,
          content: true,
          tags: true,
          status: {
            select: {
              id: true,
              code: true,
              name: true,
              color: true,
              isFinal: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          _count: { select: { attachments: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listDispatched(adminId: string, query: ListComplaintsDto) {
    const dispatches = await this.prisma.complaintDispatch.findMany({
      where: { adminId },
      select: { complaintId: true },
    });
    const complaintIds = dispatches.map((d) => d.complaintId);
    if (complaintIds.length === 0) {
      return { data: [], meta: { page: 1, limit: query.limit, total: 0, totalPages: 0 } };
    }
    const where: Prisma.ComplaintWhereInput = {
      ...this.buildWhere(query),
      id: { in: complaintIds },
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketCode: true,
          category: true,
          reporterName: true,
          content: true,
          tags: true,
          status: {
            select: { id: true, code: true, name: true, color: true, isFinal: true },
          },
          createdAt: true,
          updatedAt: true,
          _count: { select: { attachments: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return {
      data,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async dispatch(complaintId: string, dto: CreateDispatchDto) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Aduan tidak ditemukan.');

    const targetIds = (
      dto.adminIds && dto.adminIds.length > 0
        ? dto.adminIds
        : dto.adminId
          ? [dto.adminId]
          : []
    ).filter(Boolean);

    if (targetIds.length === 0) {
      throw new BadRequestException('Pilih setidaknya satu penerima disposisi.');
    }

    const admins = await this.prisma.admin.findMany({
      where: { id: { in: targetIds } },
    });
    if (admins.length === 0) {
      throw new NotFoundException('Admin tujuan tidak ditemukan.');
    }

    const results: any[] = [];
    for (const admin of admins) {
      try {
        const result = await this.prisma.complaintDispatch.upsert({
          where: { complaintId_adminId: { complaintId, adminId: admin.id } },
          update: { note: dto.note?.trim() || null },
          create: { complaintId, adminId: admin.id, note: dto.note?.trim() || null },
          include: { admin: { select: { id: true, username: true, role: true, bidang: true, displayName: true } } },
        });
        results.push(result);
      } catch (e: unknown) {
        if (targetIds.length === 1 && e && typeof e === 'object' && 'code' in e && (e as any).code === 'P2002') {
          throw new ConflictException('Aduan sudah pernah didisposisikan ke admin ini.');
        }
      }
    }

    // Sync tags if new bidangs are introduced
    const newBidangs = admins
      .map((a) => a.bidang)
      .filter((b): b is string => Boolean(b && b.trim()));

    if (newBidangs.length > 0) {
      const currentTags = (complaint.tags || '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const combined = Array.from(
        new Set([...currentTags, ...newBidangs.map((b) => b.toLowerCase())]),
      );
      if (combined.length > currentTags.length) {
        await this.prisma.complaint.update({
          where: { id: complaintId },
          data: { tags: combined.join(',') },
        });
      }
    }

    const message = results.length > 1
      ? `Aduan berhasil didisposisikan ke ${results.length} penerima.`
      : 'Aduan berhasil didisposisikan.';

    return { message, dispatches: results, dispatch: results[0] };
  }

  async getDispatches(complaintId: string) {
    return this.prisma.complaintDispatch.findMany({
      where: { complaintId },
      include: {
        admin: { select: { id: true, username: true, role: true, bidang: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async detail(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        status: true,
        histories: {
          orderBy: { createdAt: 'asc' },
          include: { status: true },
        },
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        dispatches: {
          include: {
            admin: { select: { id: true, username: true, role: true, bidang: true, displayName: true } },
          },
        },
      },
    });
    if (!complaint) throw new NotFoundException('Aduan tidak ditemukan.');
    return complaint;
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    await this.detail(id);
    const status = await this.prisma.complaintStatus.findFirst({
      where: { id: dto.statusId, isActive: true },
    });
    if (!status) {
      throw new NotFoundException('Status aktif tidak ditemukan.');
    }

    const complaint = await this.prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id },
        data: { statusId: status.id },
        include: { status: true },
      });
      await tx.complaintHistory.create({
        data: {
          complaintId: id,
          statusId: status.id,
          publicNote: dto.publicNote?.trim() || null,
        },
      });
      return complaint;
    });
    await this.notifications.notifyStatusChanged(
      complaint,
      status.name,
      dto.publicNote,
    );
    return complaint;
  }

  async exportRows(query: ListComplaintsDto) {
    return this.prisma.complaint.findMany({
      where: this.buildWhere(query),
      orderBy: { createdAt: 'desc' },
      select: {
        ticketCode: true,
        category: true,
        reporterName: true,
        contact: true,
        content: true,
        tags: true,
        status: { select: { code: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async exportDispatchedRows(adminId: string, query: ListComplaintsDto) {
    const dispatches = await this.prisma.complaintDispatch.findMany({
      where: { adminId },
      select: { complaintId: true },
    });
    const complaintIds = dispatches.map((d) => d.complaintId);
    if (complaintIds.length === 0) {
      return [];
    }
    return this.prisma.complaint.findMany({
      where: {
        ...this.buildWhere(query),
        id: { in: complaintIds },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        ticketCode: true,
        category: true,
        reporterName: true,
        contact: true,
        content: true,
        tags: true,
        status: { select: { code: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async attachment(attachmentId: string) {
    const attachment = await this.prisma.complaintAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Lampiran tidak ditemukan.');
    return {
      ...attachment,
      absolutePath: resolve(getUploadDirectory(), attachment.storageKey),
    };
  }

  async dashboard() {
    const [total, byStatus, byCategory] = await this.prisma.$transaction([
      this.prisma.complaint.count(),
      this.prisma.complaint.groupBy({
        by: ['statusId'],
        _count: true,
        orderBy: { statusId: 'asc' },
      }),
      this.prisma.complaint.groupBy({
        by: ['category'],
        _count: true,
        orderBy: { category: 'asc' },
      }),
    ]);
    const statuses = await this.prisma.complaintStatus.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    const countByStatusId = new Map(
      byStatus.map((item) => [item.statusId, item._count]),
    );

    return {
      total,
      byStatus: statuses.map((status) => ({
        status,
        count: countByStatusId.get(status.id) ?? 0,
      })),
      byCategory,
    };
  }

  private generateTicketCode() {
    const date = new Date();
    const period = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return `ADU-${period}-${randomBytes(10).toString('hex').toUpperCase()}`;
  }

  private buildWhere(query: ListComplaintsDto): Prisma.ComplaintWhereInput {
    const tagFilter = query.tag?.trim() || query.tags?.trim();
    return {
      category: query.category,
      statusId: query.statusId,
      ...(tagFilter ? { tags: { contains: tagFilter } } : {}),
      createdAt:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
      ...(query.search
        ? {
            OR: [
              { ticketCode: { contains: query.search } },
              { content: { contains: query.search } },
              { reporterName: { contains: query.search } },
            ],
          }
        : {}),
    };
  }
}
