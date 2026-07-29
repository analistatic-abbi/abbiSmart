import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  DashboardExportQueryDto,
  DashboardProcesosQueryDto,
  DashboardProyeccionesQueryDto,
} from './dto/dashboard-query.dto';
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
  async getProcesos(
    @Query() query: DashboardProcesosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.dashboardService.getProcesos(
      user.paisSesionId!,
      query.search,
    );

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

  @Get('export')
  @ApiOperation({ summary: 'Exportar dashboard a Excel (.xlsx)' })
  async exportar(
    @Query() query: DashboardExportQueryDto,
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.dashboardService.exportarXlsx(
      user.paisSesionId!,
      query.search,
      query.anio,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.send(buffer);
  }

  @Get('reportes')
  @Roles(Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA)
  @ApiOperation({ summary: 'Listar reportes mensuales generados' })
  async listarReportes(@CurrentUser() user: AuthUserPayload) {
    const data = await this.dashboardService.listarReportes(user.paisSesionId!);

    return {
      message: 'Reportes obtenidos correctamente',
      data,
    };
  }

  @Get('reportes/:id/descargar')
  @Roles(Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA)
  @ApiOperation({ summary: 'Descargar reporte mensual almacenado' })
  async descargarReporte(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ) {
    const archivo = await this.dashboardService.obtenerArchivoReporte(
      id,
      user.paisSesionId!,
    );

    return res.download(archivo.absolutePath, archivo.nombre);
  }
}
