import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard, AdminPayload } from '../auth/admin-auth.guard';
import { ComplaintStatusesService } from './complaint-statuses.service';
import { CreateComplaintStatusDto } from './dto/create-complaint-status.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AdminRequest extends Request {
  admin?: AdminPayload;
}

@ApiTags('Admin Complaint Statuses')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/complaint-statuses')
export class ComplaintStatusesController {
  constructor(private readonly statusesService: ComplaintStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar seluruh master status aduan' })
  list() {
    return this.statusesService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Daftarkan status aduan baru (Owner only)' })
  create(@Body() dto: CreateComplaintStatusDto, @Req() req: AdminRequest) {
    if (req.admin?.role !== Role.owner) {
      throw new ForbiddenException('Hanya owner yang dapat mengelola master status.');
    }
    return this.statusesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit atau nonaktifkan status aduan (Owner only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @Req() req: AdminRequest,
  ) {
    if (req.admin?.role !== Role.owner) {
      throw new ForbiddenException('Hanya owner yang dapat mengelola master status.');
    }
    return this.statusesService.update(id, dto);
  }
}
