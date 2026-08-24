import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminComplaintsController } from './admin-complaints.controller';
import { ComplaintStatusesController } from './complaint-statuses.controller';
import { ComplaintStatusesService } from './complaint-statuses.service';
import { ComplaintsService } from './complaints.service';
import { PublicComplaintsController } from './public-complaints.controller';
import { ReportExportService } from './report-export.service';

@Module({
  imports: [AuthModule, NotificationsModule, PrismaModule],
  controllers: [
    PublicComplaintsController,
    AdminComplaintsController,
    ComplaintStatusesController,
  ],
  providers: [ComplaintsService, ComplaintStatusesService, ReportExportService],
})
export class ComplaintsModule {}
