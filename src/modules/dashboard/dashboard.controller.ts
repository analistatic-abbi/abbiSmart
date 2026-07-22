import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { DashboardService } from './dashboard.service';

class DashboardProyeccionesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}

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

  @Get('proyecciones')
  @ApiOperation({ summary: 'Métricas de proyecciones para metas comerciales (PRY-010)' })
  async getProyecciones(
    @Query() query: DashboardProyeccionesQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.dashboardService.getProyecciones(
      user.paisSesionId!,
      query.anio,
    );

    return {
      message: 'Métricas de proyecciones obtenidas correctamente',
      data,
    };
  }
}
