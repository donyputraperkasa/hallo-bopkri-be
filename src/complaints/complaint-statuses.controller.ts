import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ComplaintStatusesService } from './complaint-statuses.service';
import { CreateComplaintStatusDto } from './dto/create-complaint-status.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

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
  @ApiOperation({ summary: 'Daftarkan status aduan baru' })
  create(@Body() dto: CreateComplaintStatusDto) {
    return this.statusesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit atau nonaktifkan status aduan' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.statusesService.update(id, dto);
  }
}
