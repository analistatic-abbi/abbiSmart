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
import { AsignarValidadoresDto, VeredictoValidacionDto } from '../procesos/dto/proceso.dto';
import { ProcesosService } from '../procesos/procesos.service';

export interface ValidacionPendienteDto {
  validacionId: number;
  procesoId: number;
  codigo: string | null;
  empresaMostrar: string;
  estado: EstadoProceso;
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
    private readonly auditService: AuditService,
  ) {}

  async findPendientes(
    validadorId: number,
    paisSesionId: number,
  ): Promise<ValidacionPendienteDto[]> {
    const rows = await this.validacionRepository.query(
      `SELECT
         vp2.id AS validacionId,
         v.proceso_id AS procesoId,
         v.codigo,
         v.empresa_mostrar AS empresaMostrar,
         v.estado
       FROM vista_procesos_por_validar v
       INNER JOIN validaciones_proceso vp2
         ON vp2.proceso_id = v.proceso_id AND vp2.validador_id = v.validador_id
       INNER JOIN procesos p ON p.id = v.proceso_id
       WHERE v.validador_id = ? AND p.pais_id = ?
       ORDER BY vp2.fecha_asignacion ASC`,
      [validadorId, paisSesionId],
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

    if (proceso.estado !== EstadoProceso.EN_PROCESO) {
      throw new BusinessException(
        ErrorCode.PROCESO_ESTADO_INVALIDO,
        'Solo se pueden asignar validadores a procesos en estado En Proceso',
        HttpStatus.BAD_REQUEST,
      );
    }

    const avance = await this.procesosService.getAvancePorcentaje(procesoId);

    if (avance < 100) {
      throw new BusinessException(
        ErrorCode.VALIDACION_AVANCE_INCOMPLETO,
        'El proceso debe tener 100% de avance en tareas antes de enviar a validación',
        HttpStatus.BAD_REQUEST,
      );
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

    for (const validador of validadores) {
      const exists = await this.validacionRepository.findOne({
        where: { procesoId, validadorId: validador.id },
      });

      if (!exists) {
        await this.validacionRepository.save(
          this.validacionRepository.create({
            procesoId,
            validadorId: validador.id,
            veredicto: VeredictoValidacion.PENDIENTE,
          }),
        );
      }

      await this.mailService.sendValidacionAsignadaEmail(
        validador.correo,
        validador.nombre,
        proceso.codigo ?? proceso.idDigitado,
      );
    }

    proceso.estado = EstadoProceso.EN_VALIDACION;
    await this.procesoRepository.save(proceso);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.VALIDACION_ASIGNAR,
      entidadTipo: AuditEntidadTipo.VALIDACION_PROCESO,
      entidadId: procesoId,
      valorNuevo: JSON.stringify({ validadorIds: dto.validadorIds }),
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
    }

    await this.procesoRepository.save(proceso);

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
}
