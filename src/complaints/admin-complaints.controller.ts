import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, AdminPayload } from '../auth/admin-auth.guard';
import { ComplaintsService } from './complaints.service';
import { ListComplaintsDto } from './dto/list-complaints.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { ReportExportService } from './report-export.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AdminRequest extends Request {
  admin?: AdminPayload;
}

@ApiTags('Admin Complaints')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/complaints')
export class AdminComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly reportExport: ReportExportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Rekap jumlah aduan' })
  dashboard() {
    return this.complaintsService.dashboard();
  }

  @Get()
  @ApiOperation({ summary: 'Daftar aduan dengan filter dan pagination' })
  list(@Query() query: ListComplaintsDto, @Req() req: AdminRequest) {
    const admin = req.admin!;
    // Manager hanya bisa melihat aduan yang sudah didisposisikan kepada mereka
    if (admin.role === Role.manager) {
      return this.complaintsService.listDispatched(admin.sub, query);
    }
    // Owner dan Director dapat melihat seluruh aduan secara langsung
    return this.complaintsService.list(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Daftar admin (manager & director) untuk disposisi' })
  async listUsers() {
    return this.prisma.admin.findMany({
      where: { role: { in: [Role.manager, Role.director] } },
      select: {
        id: true,
        username: true,
        role: true,
        bidang: true,
        displayName: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }],
    });
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export laporan aduan ke Excel' })
  async exportExcel(
    @Query() query: ListComplaintsDto,
    @Req() req: AdminRequest,
  ) {
    const admin = req.admin!;
    const rows =
      admin.role === Role.manager
        ? await this.complaintsService.exportDispatchedRows(admin.sub, query)
        : await this.complaintsService.exportRows(query);
    const buffer = await this.reportExport.toExcel(rows);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="laporan-aduan-${Date.now()}.xlsx"`,
    });
  }

  @Get('export.pdf')
  @ApiOperation({ summary: 'Export laporan aduan ke PDF' })
  async exportPdf(
    @Query() query: ListComplaintsDto,
    @Req() req: AdminRequest,
  ) {
    const admin = req.admin!;
    const rows =
      admin.role === Role.manager
        ? await this.complaintsService.exportDispatchedRows(admin.sub, query)
        : await this.complaintsService.exportRows(query);
    const buffer = await this.reportExport.toPdf(rows);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="laporan-aduan-${Date.now()}.pdf"`,
    });
  }

  @Get('attachments/:attachmentId')
  @ApiOperation({ summary: 'Unduh bukti lampiran sebagai admin' })
  async downloadAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    const attachment = await this.complaintsService.attachment(attachmentId);
    return new StreamableFile(createReadStream(attachment.absolutePath), {
      type: attachment.mimeType,
      disposition: `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail lengkap aduan' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AdminRequest,
  ) {
    const admin = req.admin!;
    if (admin.role === Role.manager) {
      const hasDispatch = await this.prisma.complaintDispatch.findFirst({
        where: { complaintId: id, adminId: admin.sub },
      });
      if (!hasDispatch) {
        throw new ForbiddenException(
          'Anda tidak memiliki akses untuk melihat aduan ini.',
        );
      }
    }
    return this.complaintsService.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ubah status dan tambahkan progres publik' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: AdminRequest,
  ) {
    const admin = req.admin!;
    if (admin.role === Role.director) {
      throw new ForbiddenException(
        'Direktur hanya memiliki hak akses pemantauan (read-only).',
      );
    }
    if (admin.role === Role.manager) {
      const hasDispatch = await this.prisma.complaintDispatch.findFirst({
        where: { complaintId: id, adminId: admin.sub },
      });
      if (!hasDispatch) {
        throw new ForbiddenException(
          'Anda tidak dapat mengubah status aduan yang belum didisposisikan kepada Anda.',
        );
      }
    }
    return this.complaintsService.updateStatus(id, dto);
  }

  @Post(':id/dispatch')
  @ApiOperation({ summary: 'Disposisikan aduan ke manager atau director' })
  dispatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDispatchDto,
    @Req() req: AdminRequest,
  ) {
    const admin = req.admin!;
    if (admin.role !== Role.owner) {
      throw new ForbiddenException(
        'Hanya owner yang memiliki hak akses untuk mendisposisikan aduan.',
      );
    }
    return this.complaintsService.dispatch(id, dto);
  }

  @Get(':id/dispatches')
  @ApiOperation({ summary: 'Daftar disposisi untuk aduan tertentu' })
  getDispatches(@Param('id', ParseUUIDPipe) id: string) {
    return this.complaintsService.getDispatches(id);
  }
}
