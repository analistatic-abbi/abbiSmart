import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AlertasControlService } from '../../common/services/alertas-control.service';
import { SesionService } from '../auth/sesion.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ProyeccionesService } from '../proyecciones/proyecciones.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly proyeccionesService: ProyeccionesService,
    private readonly notificacionesService: NotificacionesService,
    private readonly sesionService: SesionService,
    private readonly alertasControlService: AlertasControlService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async ejecutarProyeccionEstadoJob(): Promise<void> {
    const result = await this.runProyeccionEstadoJob();
    this.logger.log(
      `ProyeccionEstadoJob: ${result.estadosActualizados} estados actualizados, ${result.notificacionesEnviadas} alertas enviadas`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async ejecutarRelacionamientoVencidoJob(): Promise<void> {
    const result = await this.runRelacionamientoVencidoJob();
    this.logger.log(
      `RelacionamientoVencidoJob: ${result.notificacionesEnviadas} alertas enviadas`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async ejecutarSesionCleanupJob(): Promise<void> {
    const result = await this.runSesionCleanupJob();
    this.logger.log(`SesionCleanupJob: ${result.sesionesEliminadas} sesiones eliminadas`);
  }

  async runProyeccionEstadoJob(): Promise<{
    estadosActualizados: number;
    notificacionesEnviadas: number;
  }> {
    return this.proyeccionesService.actualizarEstadosYNotificar();
  }

  async runRelacionamientoVencidoJob(): Promise<{
    notificacionesEnviadas: number;
  }> {
    const notificacionesEnviadas = await this.notificarRelacionamientosVencidos();

    return { notificacionesEnviadas };
  }

  async runSesionCleanupJob(): Promise<{ sesionesEliminadas: number }> {
    const sesionesEliminadas = await this.sesionService.deleteExpiredSessions();

    return { sesionesEliminadas };
  }

  private async notificarRelacionamientosVencidos(): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT r.id, r.emisor_usuario_id AS emisorUsuarioId
       FROM vista_relacionamientos_vencidos v
       INNER JOIN relacionamientos r ON r.id = v.id`,
    );

    let enviadas = 0;

    for (const row of rows as Array<{ id: number; emisorUsuarioId: number }>) {
      const yaEnviada = await this.alertasControlService.yaEnviadaRelacionamiento(
        row.id,
      );

      if (yaEnviada) {
        continue;
      }

      await this.notificacionesService.crear({
        usuarioId: row.emisorUsuarioId,
        tipo: 'relacionamiento_vencido',
        mensaje: `El relacionamiento #${row.id} superó el plazo de respuesta`,
        entidadTipo: 'relacionamiento',
        entidadId: row.id,
      });

      await this.alertasControlService.registrarRelacionamiento(row.id);

      enviadas += 1;
    }

    return enviadas;
  }
}
