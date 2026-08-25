import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import { VeredictoValidacion } from '../../common/enums/veredicto-validacion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { PermisosService } from '../../common/services/permisos.service';
import { Proceso } from '../../database/entities/proceso.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ValidacionProceso } from '../../database/entities/validacion-proceso.entity';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AsignarValidadoresDto, VeredictoValidacionDto } from '../procesos/dto/proceso.dto';
import { ProcesosService } from '../procesos/procesos.service';

export interface ValidacionPendienteDto {
  validacionId: number;
  procesoId: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: EstadoProceso;
  validadorNombre?: string;
}

@Injectable()
export class ValidacionService {
  constructor(
    @InjectRepository(ValidacionProceso)
    private readonly validacionRepository: Repository<ValidacionProceso>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    private readonly procesosService: ProcesosService,
    private readonly permisosService: PermisosService,
    private readonly mailService: MailService,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditService: AuditService,
  ) {}

  async findValidadoresDisponibles(): Promise<
    Array<{ id: number; nombre: string; correo: string }>
  > {
    const validadores = await this.usuarioRepository.find({
      where: {
        rol: Rol.VALIDADOR,
        estado: EstadoUsuario.ACTIVO,
        eliminado: false,
      },
      order: { nombre: 'ASC' },
    });

    return validadores.map((validador) => ({
      id: validador.id,
      nombre: validador.nombre,
      correo: validador.correo,
    }));
  }

  async findPendientes(
    userId: number,
    paisSesionId: number,
    rol: Rol,
    search?: string,
    empresaClienteId?: number,
  ): Promise<ValidacionPendienteDto[]> {
    if (!this.permisosService.puedeAccederModuloValidacion(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No tiene permisos para ver la bandeja de validación',
        HttpStatus.FORBIDDEN,
      );
    }

    const esSupervision =
      rol === Rol.ADMINISTRADOR || rol === Rol.SUPERVISOR_SISTEMA;
    const params: unknown[] = esSupervision
      ? [paisSesionId]
      : [userId, paisSesionId];
    let searchClause = '';

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      const searchFields = esSupervision
        ? `(v.codigo LIKE ? OR CAST(v.proceso_id AS CHAR) LIKE ? OR u.nombre LIKE ? OR u.correo LIKE ?)`
        : `(v.codigo LIKE ? OR CAST(v.proceso_id AS CHAR) LIKE ?)`;
      searchClause = ` AND ${searchFields}`;
      params.push(...(esSupervision ? [term, term, term, term] : [term, term]));
    }

    if (empresaClienteId) {
      searchClause += ' AND p.empresa_cliente_id = ?';
      params.push(empresaClienteId);
    }

    const validadorFilter = esSupervision ? '' : 'v.validador_id = ? AND ';

    const rows = await this.validacionRepository.query(
      `SELECT
         vp2.id AS validacionId,
         v.proceso_id AS procesoId,
         v.codigo,
         v.empresa_mostrar AS empresaMostrar,
         v.estado${
           esSupervision ? ',\n         u.nombre AS validadorNombre' : ''
         }
       FROM vista_procesos_por_validar v
       INNER JOIN validaciones_proceso vp2
         ON vp2.proceso_id = v.proceso_id AND vp2.validador_id = v.validador_id
       INNER JOIN procesos p ON p.id = v.proceso_id${
         esSupervision
           ? '\n       INNER JOIN usuarios u ON u.id = v.validador_id'
           : ''
       }
       WHERE ${validadorFilter}p.pais_id = ?${searchClause}
       ORDER BY vp2.fecha_asignacion ASC`,
      params,
    );

    return rows as ValidacionPendienteDto[];
  }

  async asignarValidadores(
    procesoId: number,
    dto: AsignarValidadoresDto,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<void> {
    if (
      rol !== Rol.ADMINISTRADOR &&
      rol !== Rol.SUPERVISOR_SISTEMA &&
      rol !== Rol.OPERADOR
    ) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'No tiene permisos para asignar validadores',
        HttpStatus.FORBIDDEN,
      );
    }

    const proceso = await this.procesosService.getProcesoActivoOrFail(
      procesoId,
      paisSesionId,
    );

    const existentes = await this.validacionRepository.find({
      where: { procesoId },
    });
    const esReasignacionInicial = proceso.estado === EstadoProceso.EN_PROCESO;
    const esAmpliacion =
      proceso.estado === EstadoProceso.EN_VALIDACION && existentes.length > 0;

    if (!esReasignacionInicial && !esAmpliacion) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        'Solo se pueden asignar validadores a procesos en En Proceso, o añadir validadores mientras el proceso está En Validación',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (esAmpliacion) {
      const hayVeredictoConfirmado = existentes.some(
        (item) => item.veredicto !== VeredictoValidacion.PENDIENTE,
      );
      if (hayVeredictoConfirmado) {
        throw new BusinessException(
          ErrorCode.PROCESO_ESTADO_INVALIDO,
          'No se pueden añadir validadores porque alguno ya emitió un veredicto',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existentesIds = existentes.map((item) => Number(item.validadorId));
      const faltantes = existentesIds.filter(
        (id) => !dto.validadorIds.map(Number).includes(id),
      );
      if (faltantes.length > 0) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          'No se pueden quitar validadores ya asignados; solo es posible añadir otros',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (esReasignacionInicial) {
      const avance = await this.procesosService.getAvancePorcentaje(procesoId);

      if (avance < 100) {
        throw new BusinessException(
          ErrorCode.VALIDACION_AVANCE_INCOMPLETO,
          'El proceso debe tener 100% de avance en tareas antes de enviar a validación',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const validadores = await this.usuarioRepository.find({
      where: {
        id: In(dto.validadorIds),
        rol: Rol.VALIDADOR,
        estado: EstadoUsuario.ACTIVO,
        eliminado: false,
      },
    });

    if (validadores.length !== dto.validadorIds.length) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Uno o más validadores no son válidos',
        HttpStatus.BAD_REQUEST,
      );
    }

    const validadorIds = new Set(dto.validadorIds.map(Number));
    const existentesPorValidador = new Map(
      existentes.map((item) => [Number(item.validadorId), item]),
    );

    if (esReasignacionInicial) {
      await this.validacionRepository
        .createQueryBuilder()
        .delete()
        .from(ValidacionProceso)
        .where('proceso_id = :procesoId', { procesoId })
        .andWhere('validador_id NOT IN (:...validadorIds)', {
          validadorIds: [...validadorIds],
        })
        .execute();
    }

    const nuevosValidadorIds: number[] = [];

    for (const validador of validadores) {
      const exists = existentesPorValidador.get(Number(validador.id));

      if (exists) {
        if (esReasignacionInicial) {
          exists.veredicto = VeredictoValidacion.PENDIENTE;
          exists.comentario = null;
          exists.fechaVeredicto = null;
          exists.fechaAsignacion = new Date();
          await this.validacionRepository.save(exists);
          nuevosValidadorIds.push(Number(validador.id));
        }
        continue;
      }

      await this.validacionRepository.save(
        this.validacionRepository.create({
          procesoId,
          validadorId: validador.id,
          veredicto: VeredictoValidacion.PENDIENTE,
        }),
      );
      nuevosValidadorIds.push(Number(validador.id));
    }

    for (const validador of validadores) {
      if (!nuevosValidadorIds.includes(Number(validador.id))) {
        continue;
      }
      await this.mailService.sendValidacionAsignadaEmail(
        validador.correo,
        validador.nombre,
        proceso.codigo ?? proceso.idDigitado,
      );
    }

    if (esReasignacionInicial) {
      proceso.estado = EstadoProceso.EN_VALIDACION;
      proceso.validadoresAsignadoPorId = actorId;
      await this.procesoRepository.save(proceso);
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.VALIDACION_ASIGNAR,
      entidadTipo: AuditEntidadTipo.VALIDACION_PROCESO,
      entidadId: procesoId,
      valorNuevo: JSON.stringify({
        validadorIds: dto.validadorIds,
        modo: esAmpliacion ? 'ampliacion' : 'asignacion_inicial',
      }),
    });
  }

  async registrarVeredicto(
    validacionId: number,
    dto: VeredictoValidacionDto,
    actorId: number,
    rol: Rol,
  ): Promise<void> {
    if (!this.permisosService.puedeEjecutarValidacion(rol)) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo los validadores pueden emitir veredictos',
        HttpStatus.FORBIDDEN,
      );
    }

    const validacion = await this.validacionRepository.findOne({
      where: { id: validacionId },
      relations: { proceso: true },
    });

    if (!validacion || Number(validacion.validadorId) !== Number(actorId)) {
      throw new BusinessException(
        ErrorCode.VALIDACION_NO_ENCONTRADA,
        'Validación no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    if (validacion.veredicto !== VeredictoValidacion.PENDIENTE) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Esta validación ya fue resuelta',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      dto.veredicto === 'Requiere Corrección' &&
      !dto.comentario?.trim()
    ) {
      throw new BusinessException(
        ErrorCode.VALIDACION_COMENTARIO_REQUERIDO,
        'El comentario es obligatorio cuando el veredicto es Requiere Corrección',
        HttpStatus.BAD_REQUEST,
      );
    }

    validacion.veredicto =
      dto.veredicto === 'Aprobado'
        ? VeredictoValidacion.APROBADO
        : VeredictoValidacion.REQUIERE_CORRECCION;
    validacion.comentario = dto.comentario ?? null;
    validacion.fechaVeredicto = new Date();
    await this.validacionRepository.save(validacion);

    const proceso = validacion.proceso;
    const estadoAntes = proceso.estado;
    const validaciones = await this.validacionRepository.find({
      where: { procesoId: proceso.id },
    });

    if (
      validaciones.some(
        (item) => item.veredicto === VeredictoValidacion.REQUIERE_CORRECCION,
      )
    ) {
      proceso.estado = EstadoProceso.EN_PROCESO;
    } else if (
      validaciones.every(
        (item) => item.veredicto === VeredictoValidacion.APROBADO,
      )
    ) {
      proceso.estado = EstadoProceso.PRESENTADO;
      await this.limpiarComentariosDevolucionValidacion(proceso.id);
    }

    await this.procesoRepository.save(proceso);

    if (
      validacion.veredicto === VeredictoValidacion.REQUIERE_CORRECCION &&
      estadoAntes === EstadoProceso.EN_VALIDACION &&
      proceso.estado === EstadoProceso.EN_PROCESO
    ) {
      const validador = await this.usuarioRepository.findOne({
        where: { id: validacion.validadorId },
      });
      await this.notificarProcesoDevueltoValidacion(
        proceso,
        validacion.comentario,
        validador?.nombre ?? null,
      );

      if (proceso.validadoresAsignadoPorId) {
        const asignador = await this.usuarioRepository.findOne({
          where: { id: proceso.validadoresAsignadoPorId },
        });

        if (asignador) {
          await this.mailService.sendValidacionDevueltaEmail(
            asignador.correo,
            asignador.nombre,
            proceso.codigo ?? proceso.idDigitado,
            validador?.nombre ?? 'Validador',
            validacion.comentario,
          );
        }
      }
    }

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.VALIDACION_VEREDICTO,
      entidadTipo: AuditEntidadTipo.VALIDACION_PROCESO,
      entidadId: validacion.id,
      valorNuevo: JSON.stringify({
        veredicto: validacion.veredicto,
        comentario: validacion.comentario,
        procesoEstado: proceso.estado,
      }),
    });
  }

  async getRevisionProceso(
    procesoId: number,
    paisSesionId: number,
    validadorId?: number,
    rol?: Rol,
  ) {
    if (rol === Rol.VALIDADOR && validadorId) {
      const asignacion = await this.validacionRepository.findOne({
        where: { procesoId, validadorId },
      });

      if (!asignacion) {
        throw new BusinessException(
          ErrorCode.VALIDACION_NO_ASIGNADA,
          'No está asignado como validador de este proceso',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const proceso = await this.procesosService.findById(procesoId, paisSesionId);
    const tareas = await this.procesosService.findTareas(procesoId, paisSesionId);

    return {
      proceso,
      tareas,
    };
  }

  async findValidacionesByProceso(procesoId: number, paisSesionId: number) {
    await this.procesosService.getProcesoActivoOrFail(procesoId, paisSesionId);

    const validaciones = await this.validacionRepository.find({
      where: { procesoId },
      relations: { validador: true },
      order: { fechaAsignacion: 'ASC' },
    });

    return validaciones.map((item) => ({
      id: item.id,
      validadorId: item.validadorId,
      validadorNombre: item.validador?.nombre ?? null,
      veredicto: item.veredicto,
      comentario: item.comentario,
      fechaAsignacion: item.fechaAsignacion,
      fechaVeredicto: item.fechaVeredicto,
    }));
  }

  private async limpiarComentariosDevolucionValidacion(
    procesoId: number,
  ): Promise<void> {
    await this.validacionRepository.update(
      { procesoId },
      { comentario: null },
    );
  }

  private async notificarProcesoDevueltoValidacion(
    proceso: Proceso,
    comentario: string | null,
    validadorNombre: string | null,
  ): Promise<void> {
    const procesoLabel = proceso.codigo ?? proceso.idDigitado ?? `ID ${proceso.id}`;
    const validadorResumen = validadorNombre ? ` Validador: ${validadorNombre}.` : '';
    const comentarioResumen = comentario?.trim()
      ? ` Comentario: ${comentario.trim().slice(0, 200)}`
      : '';
    const mensaje = `El proceso ${procesoLabel} fue devuelto de validación y requiere correcciones.${validadorResumen}${comentarioResumen}`;

    const destinatarios = await this.resolverDestinatariosCorreccionProceso(
      proceso.paisId,
      proceso.usuarioCreadorId,
    );

    for (const usuarioId of destinatarios) {
      await this.notificacionesService.crear({
        usuarioId,
        tipo: 'proceso_validacion_correccion',
        mensaje,
        entidadTipo: 'proceso',
        entidadId: proceso.id,
      });
    }
  }

  private async resolverDestinatariosCorreccionProceso(
    paisId: number,
    usuarioCreadorId: number,
  ): Promise<number[]> {
    const rows = await this.usuarioRepository.query(
      `SELECT id
       FROM usuarios
       WHERE eliminado = FALSE
         AND estado = ?
         AND (
           id = ?
           OR rol IN (?, ?)
           OR (rol = ? AND pais_id = ?)
         )`,
      [
        EstadoUsuario.ACTIVO,
        usuarioCreadorId,
        Rol.ADMINISTRADOR,
        Rol.SUPERVISOR_SISTEMA,
        Rol.OPERADOR,
        paisId,
      ],
    );

    return Array.from(
      new Set(rows.map((row: { id: number }) => Number(row.id))),
    );
  }
}
