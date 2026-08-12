import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplaintStatusDto } from './dto/create-complaint-status.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

@Injectable()
export class ComplaintStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.complaintStatus.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { complaints: true } } },
    });
  }

  async create(dto: CreateComplaintStatusDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.complaintStatus.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Status dengan code ${code} sudah ada.`);
    }

    return this.prisma.complaintStatus.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        color: dto.color?.toUpperCase() || null,
        sortOrder: dto.sortOrder ?? 0,
        isFinal: dto.isFinal ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateComplaintStatusDto) {
    const status = await this.prisma.complaintStatus.findUnique({
      where: { id },
    });
    if (!status) throw new NotFoundException('Status tidak ditemukan.');
    if (status.code === 'NEW' && dto.isActive === false) {
      throw new ConflictException(
        'Status default NEW tidak boleh dinonaktifkan.',
      );
    }

    return this.prisma.complaintStatus.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description.trim(),
        color: dto.color?.toUpperCase(),
        sortOrder: dto.sortOrder,
        isFinal: dto.isFinal,
        isActive: dto.isActive,
      },
    });
  }
}
