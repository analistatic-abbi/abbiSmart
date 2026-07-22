import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { AlertaEnviada } from '../../database/entities/alerta-enviada.entity';
import { Proceso } from '../../database/entities/proceso.entity';
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
    @InjectRepository(AlertaEnviada)
    private readonly alertaRepository: Repository<AlertaEnviada>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
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
    const estadosActualizados =
      await this.proyeccionesService.actualizarEstadosAutomaticos();
    const notificacionesEnviadas = await this.notificarProyeccionesUrgentes();

    return { estadosActualizados, notificacionesEnviadas };
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

  private async notificarProyeccionesUrgentes(): Promise<number> {
    const rows = await this.proyeccionRepositoryQuery();

    let enviadas = 0;

    for (const row of rows) {
      const umbral =
        row.estado === EstadoProyeccion.PROXIMO ? 'Proximo' : 'SaleEsteMes';

      const yaEnviada = await this.alertaRepository.findOne({
        where: { proyeccionId: row.id, umbral },
      });

      if (yaEnviada) {
        continue;
      }

      const usuarioId = await this.resolveUsuarioProyeccion(row.id);

      if (!usuarioId) {
        continue;
      }

      await this.notificacionesService.crear({
        usuarioId,
        tipo: 'proyeccion_proxima',
        mensaje: `La proyección #${row.id} está en estado "${row.estado}"`,
        entidadTipo: 'proyeccion',
        entidadId: row.id,
      });

      await this.alertaRepository.save(
        this.alertaRepository.create({
          proyeccionId: row.id,
          umbral,
        }),
      );

      enviadas += 1;
    }

    return enviadas;
  }

  private async proyeccionRepositoryQuery(): Promise<
    Array<{ id: number; estado: EstadoProyeccion }>
  > {
    return this.alertaRepository.query(
      `SELECT id, estado
       FROM proyecciones
       WHERE eliminado = FALSE
         AND estado IN ('Proximo', 'Sale este mes')`,
    );
  }

  private async resolveUsuarioProyeccion(
    proyeccionId: number,
  ): Promise<number | null> {
    const rows = await this.procesoRepository.query(
      `SELECT p.usuario_creador_id AS usuarioId
       FROM proyecciones py
       INNER JOIN procesos p ON p.id = py.proceso_origen_id
       WHERE py.id = ?`,
      [proyeccionId],
    );

    return rows[0]?.usuarioId ? Number(rows[0].usuarioId) : null;
  }

  private async notificarRelacionamientosVencidos(): Promise<number> {
    const rows = await this.alertaRepository.query(
      `SELECT r.id, r.emisor_usuario_id AS emisorUsuarioId
       FROM vista_relacionamientos_vencidos v
       INNER JOIN relacionamientos r ON r.id = v.id`,
    );

    let enviadas = 0;

    for (const row of rows as Array<{ id: number; emisorUsuarioId: number }>) {
      const yaEnviada = await this.alertaRepository.findOne({
        where: { relacionamientoId: row.id, umbral: 'vencimiento' },
      });

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

      await this.alertaRepository.save(
        this.alertaRepository.create({
          relacionamientoId: row.id,
          umbral: 'vencimiento',
        }),
      );

      enviadas += 1;
    }

    return enviadas;
  }
}
