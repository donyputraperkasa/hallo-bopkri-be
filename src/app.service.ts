import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { service: 'Hallo BOPKRI API', status: 'ok' };
  }
}
