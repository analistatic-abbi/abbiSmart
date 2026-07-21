import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    const { database } = await this.healthService.checkDatabase();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
