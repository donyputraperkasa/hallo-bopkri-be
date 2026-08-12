import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { attachmentUploadOptions } from './attachment.config';

@ApiTags('Public Complaints')
@Controller('complaints')
export class PublicComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 3, attachmentUploadOptions))
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Kirim aduan tanpa login' })
  create(
    @Body() dto: CreateComplaintDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.complaintsService.create(dto, files);
  }

  @Get('track/:ticketCode')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Lacak progres menggunakan kode tiket' })
  track(@Param('ticketCode') ticketCode: string) {
    return this.complaintsService.track(ticketCode);
  }
}
