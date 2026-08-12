import { Injectable, NotFoundException } from '@nestjs/common';
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
    return {
      category: query.category,
      statusId: query.statusId,
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
