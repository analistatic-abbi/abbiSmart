import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen de procesos por estado y segmento (REV-003)' })
  async getResumen(@CurrentUser() user: AuthUserPayload) {
    const resumen = await this.dashboardService.getResumen(user.paisSesionId!);

    return {
      message: 'Resumen del dashboard obtenido correctamente',
      resumen,
    };
  }

  @Get('procesos')
  @ApiOperation({ summary: 'Listado de procesos con avance y métricas SGP (REV-001)' })
  async getProcesos(@CurrentUser() user: AuthUserPayload) {
    const data = await this.dashboardService.getProcesos(user.paisSesionId!);

    return {
      message: 'Procesos del dashboard obtenidos correctamente',
      data,
    };
  }
}
