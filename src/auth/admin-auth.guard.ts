import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface AdminRequest extends Request {
  admin?: { sub: string; username: string };
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token admin diperlukan.');
    }

    try {
      request.admin = await this.jwt.verifyAsync<{
        sub: string;
        username: string;
      }>(token);
      return true;
    } catch {
      throw new UnauthorizedException(
        'Token admin tidak valid atau kedaluwarsa.',
      );
    }
  }
}
