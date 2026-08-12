import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ComplaintsService } from './complaints.service';
import { ListComplaintsDto } from './dto/list-complaints.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReportExportService } from './report-export.service';

@ApiTags('Admin Complaints')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/complaints')
export class AdminComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly reportExport: ReportExportService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Rekap jumlah aduan' })
  dashboard() {
    return this.complaintsService.dashboard();
  }

  @Get()
  @ApiOperation({ summary: 'Daftar aduan dengan filter dan pagination' })
  list(@Query() query: ListComplaintsDto) {
    return this.complaintsService.list(query);
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export laporan aduan ke Excel' })
  async exportExcel(@Query() query: ListComplaintsDto) {
    const rows = await this.complaintsService.exportRows(query);
    const buffer = await this.reportExport.toExcel(rows);
    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="laporan-aduan-${Date.now()}.xlsx"`,
    });
  }

  @Get('export.pdf')
  @ApiOperation({ summary: 'Export laporan aduan ke PDF' })
  async exportPdf(@Query() query: ListComplaintsDto) {
    const rows = await this.complaintsService.exportRows(query);
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
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.complaintsService.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ubah status dan tambahkan progres publik' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.complaintsService.updateStatus(id, dto);
  }
}
