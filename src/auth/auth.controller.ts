import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminAuthGuard, AdminPayload } from './admin-auth.guard';
import { Request } from 'express';

interface AdminRequest extends Request {
  admin?: AdminPayload;
}

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login admin' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil admin saat ini' })
  me(@Req() req: AdminRequest) {
    const admin = req.admin!;
    return {
      id: admin.sub,
      username: admin.username,
      role: admin.role,
      bidang: admin.bidang ?? null,
      displayName: admin.displayName ?? admin.username,
    };
  }
}
