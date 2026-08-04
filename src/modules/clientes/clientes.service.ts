import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { SegmentoCliente } from '../../common/enums/segmento-cliente.enum';
import { Rol } from '../../common/enums/rol.enum';
import { ClientesQueryDto } from '../../common/dto/pagination-query.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { EliminacionDependenciasService } from '../../common/services/eliminacion-dependencias.service';
import { PermisosService } from '../../common/services/permisos.service';
import {
  normalizeEntityName,
  rankBySimilarity,
} from '../../common/utils/text-similarity.util';
import {
  applyFiltroEliminadosQb,
  resolveFiltroEliminados,
} from '../../common/utils/filtro-eliminados.util';
import { Cliente } from '../../database/entities/cliente.entity';
import { Contacto } from '../../database/entities/contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { Relacionamiento } from '../../database/entities/relacionamiento.entity';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { AuditService } from '../audit/audit.service';
import { ClienteResponseDto } from './dto/cliente-response.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { SimilarEntityDto } from '../../common/dto/similares-query.dto';
import {
  ClienteHistorialItemDto,
  ClienteHistorialQueryDto,
} from './dto/cliente-historial.dto';
import { ClienteVista360Dto } from './dto/cliente-vista-360.dto';

export interface ClientesPage {
  data: ClienteResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(Relacionamiento)
    private readonly relacionamientoRepository: Repository<Relacionamiento>,
    @InjectRepository(UbicacionGeografica)
    private readonly ubicacionRepository: Repository<UbicacionGeografica>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly eliminacionDependenciasService: EliminacionDependenciasService,
    private readonly permisosService: PermisosService,
  ) {}

  async findAll(
    query: ClientesQueryDto,
    paisSesionId: number,
    rol: Rol,
  ): Promise<ClientesPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filtroEliminados = resolveFiltroEliminados(
      query.filtroEliminados,
      query.incluirEliminados,
      rol,
      this.permisosService,
    );

    const qb = this.clienteRepository
      .createQueryBuilder('c')
      .where('c.pais_id = :paisSesionId', { paisSesionId });

    applyFiltroEliminadosQb(qb, 'c', filtroEliminados);

    if (query.search) {
      qb.andWhere('c.empresa LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.segmento) {
      qb.andWhere('c.segmento = :segmento', { segmento: query.segmento });
    }

    qb.orderBy('c.empresa', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [clientes, total] = await qb.getManyAndCount();

    return {
      data: clientes.map((cliente) => this.toResponse(cliente)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number, paisSesionId: number): Promise<ClienteResponseDto> {
    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    return this.toResponse(cliente);
  }

  async buscarSimilares(
    query: string,
    paisSesionId: number,
    limit = 5,
  ): Promise<SimilarEntityDto[]> {
    const normalized = normalizeEntityName(query);
    if (normalized.length < 3) {
      return [];
    }

    const prefix = normalized.slice(0, Math.min(4, normalized.length));
    const candidatos = await this.clienteRepository
      .createQueryBuilder('c')
      .where('c.pais_id = :paisSesionId', { paisSesionId })
      .andWhere('c.eliminado = false')
      .andWhere('c.empresa_normalizada LIKE :prefix', { prefix: `${prefix}%` })
      .take(100)
      .getMany();

    return rankBySimilarity(query, candidatos, (c) => c.empresa, 0.85, limit).map(
      ({ item, similitud }) => ({
        id: Number(item.id),
        nombre: item.empresa,
        similitud: Math.round(similitud * 100) / 100,
      }),
    );
  }

  async getHistorial(
    clienteId: number,
    query: ClienteHistorialQueryDto,
    paisSesionId: number,
  ): Promise<{ data: ClienteHistorialItemDto[]; total: number; page: number; limit: number }> {
    await this.getClienteActivoOrFail(clienteId, paisSesionId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const procesos = await this.procesoRepository.find({
      where: { empresaClienteId: clienteId, eliminado: false },
      order: { fechaCreacion: 'DESC' },
    });

    const relacionamientos = await this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.contacto', 'co')
      .where('co.cliente_id = :clienteId', { clienteId })
      .andWhere('r.eliminado = false')
      .orderBy('r.fecha_mensaje', 'DESC')
      .getMany();

    const items: ClienteHistorialItemDto[] = [
      ...procesos.map((proceso) => ({
        tipo: 'proceso' as const,
        entidadId: Number(proceso.id),
        fecha: proceso.fechaCreacion.toISOString().slice(0, 10),
        titulo: proceso.codigo ?? proceso.idDigitado,
        subtitulo: 'Proceso de licitación',
        estado: proceso.estado,
      })),
      ...relacionamientos.map((rel) => ({
        tipo: 'relacionamiento' as const,
        entidadId: Number(rel.id),
        fecha: rel.fechaMensaje,
        titulo: `${rel.canal} — ${rel.mensaje.slice(0, 80)}${rel.mensaje.length > 80 ? '…' : ''}`,
        subtitulo: rel.fechaReunion
          ? `Reunión: ${rel.fechaReunion}`
          : rel.respuesta ?? undefined,
        estado: rel.resultado,
        contactoNombre: rel.contacto?.nombre ?? null,
      })),
    ];

    items.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const total = items.length;
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);

    return { data, total, page, limit };
  }

  async getClienteActivoOrFail(
    id: number,
    paisSesionId: number,
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id, eliminado: false },
    });

    if (!cliente || Number(cliente.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.CLIENTE_NO_ENCONTRADO,
        'Cliente no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return cliente;
  }

  async create(
    dto: CreateClienteDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ClienteResponseDto> {
    this.validateSegmentoOtro(dto.segmento, dto.segmentoOtro);
    await this.validateUbicacionInPais(dto.ubicacionId, paisSesionId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const cliente = manager.create(Cliente, {
        empresa: dto.empresa,
        empresaNormalizada: normalizeEntityName(dto.empresa),
        paisId: paisSesionId,
        ubicacionId: dto.ubicacionId,
        segmento: dto.segmento,
        segmentoOtro:
          dto.segmento === SegmentoCliente.OTRO ? dto.segmentoOtro ?? null : null,
        eliminado: false,
      });

      const clienteGuardado = await manager.save(cliente);

      const contactoGenerico = manager.create(Contacto, {
        clienteId: clienteGuardado.id,
        nombre: `Contacto General - ${clienteGuardado.empresa}`,
        nombreNormalizado: normalizeEntityName(
          `Contacto General - ${clienteGuardado.empresa}`,
        ),
        ubicacionId: clienteGuardado.ubicacionId,
        esGenerico: true,
        eliminado: false,
      });

      await manager.save(contactoGenerico);

      return clienteGuardado;
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_CREAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: saved.id,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async update(
    id: number,
    dto: UpdateClienteDto,
    actorId: number,
    paisSesionId: number,
  ): Promise<ClienteResponseDto> {
    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    const valorAnterior = JSON.stringify(this.toResponse(cliente));

    const segmento = dto.segmento ?? cliente.segmento;
    const segmentoOtro =
      dto.segmentoOtro !== undefined
        ? dto.segmentoOtro
        : cliente.segmentoOtro;

    this.validateSegmentoOtro(segmento, segmentoOtro ?? undefined);

    if (dto.ubicacionId !== undefined) {
      await this.validateUbicacionInPais(dto.ubicacionId, paisSesionId);
      cliente.ubicacionId = dto.ubicacionId;
    }

    if (dto.empresa !== undefined) {
      cliente.empresa = dto.empresa;
      cliente.empresaNormalizada = normalizeEntityName(dto.empresa);
    }

    cliente.segmento = segmento;
    cliente.segmentoOtro =
      segmento === SegmentoCliente.OTRO ? segmentoOtro : null;

    const saved = await this.clienteRepository.save(cliente);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_EDITAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: saved.id,
      valorAnterior,
      valorNuevo: JSON.stringify(this.toResponse(saved)),
    });

    return this.toResponse(saved);
  }

  async softDelete(
    id: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
    confirmarDependientes = false,
  ): Promise<void> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede eliminar clientes directamente',
        HttpStatus.FORBIDDEN,
      );
    }

    const cliente = await this.getClienteActivoOrFail(id, paisSesionId);
    const dependencias =
      await this.eliminacionDependenciasService.verificarCliente(cliente.id);

    this.eliminacionDependenciasService.assertPuedeEliminar(
      dependencias,
      confirmarDependientes,
      this.permisosService.puedeEliminarDirecto(rol),
    );

    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      cliente.eliminado = true;
      cliente.fechaEliminacion = now;
      cliente.eliminadoPorId = actorId;
      await manager.save(cliente);

      await manager.update(
        Contacto,
        { clienteId: cliente.id, eliminado: false },
        {
          eliminado: true,
          fechaEliminacion: now,
          eliminadoPorId: actorId,
        },
      );
    });

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_ELIMINAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: cliente.id,
    });
  }

  async getDependencias(id: number, paisSesionId: number) {
    await this.getClienteActivoOrFail(id, paisSesionId);
    return this.eliminacionDependenciasService.verificarCliente(id);
  }

  async reasignarProcesos(
    clienteOrigenId: number,
    nuevoClienteId: number,
    actorId: number,
    paisSesionId: number,
    rol: Rol,
  ): Promise<{ reasignados: number }> {
    if (rol !== Rol.ADMINISTRADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Solo el Administrador puede reasignar procesos',
        HttpStatus.FORBIDDEN,
      );
    }

    if (clienteOrigenId === nuevoClienteId) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'El cliente destino debe ser diferente al origen',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.getClienteActivoOrFail(clienteOrigenId, paisSesionId);
    await this.getClienteActivoOrFail(nuevoClienteId, paisSesionId);

    const result = await this.procesoRepository.update(
      {
        empresaClienteId: clienteOrigenId,
        paisId: paisSesionId,
        eliminado: false,
      },
      { empresaClienteId: nuevoClienteId },
    );

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CLIENTE_EDITAR,
      entidadTipo: AuditEntidadTipo.CLIENTE,
      entidadId: clienteOrigenId,
      valorNuevo: JSON.stringify({
        accion: 'reasignar_procesos',
        nuevoClienteId,
        reasignados: result.affected ?? 0,
      }),
    });

    return { reasignados: result.affected ?? 0 };
  }

  async findClienteIdByEmpresa(
    empresa: string,
    paisSesionId: number,
  ): Promise<number> {
    const empresaNormalizada = normalizeEntityName(empresa);
    const cliente = await this.clienteRepository.findOne({
      where: {
        empresaNormalizada,
        paisId: paisSesionId,
        eliminado: false,
      },
    });

    if (!cliente) {
      throw new BusinessException(
        ErrorCode.CLIENTE_NO_ENCONTRADO,
        `Cliente no encontrado: ${empresa}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return cliente.id;
  }

  async validateUbicacionInPais(
    ubicacionId: number,
    paisSesionId: number,
  ): Promise<UbicacionGeografica> {
    const ubicacion = await this.ubicacionRepository.findOne({
      where: { id: ubicacionId },
    });

    if (!ubicacion || Number(ubicacion.paisId) !== Number(paisSesionId)) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Ubicación geográfica no válida para el país de sesión',
        HttpStatus.BAD_REQUEST,
      );
    }

    return ubicacion;
  }

  private validateSegmentoOtro(
    segmento: SegmentoCliente,
    segmentoOtro?: string,
  ): void {
    if (segmento === SegmentoCliente.OTRO && !segmentoOtro?.trim()) {
      throw new BusinessException(
        ErrorCode.SEGMENTO_OTRO_REQUERIDO,
        'Debe indicar el valor de segmento cuando selecciona Otro',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getVista360(
    clienteId: number,
    paisSesionId: number,
  ): Promise<ClienteVista360Dto> {
    const cliente = await this.getClienteActivoOrFail(clienteId, paisSesionId);

    const ubicacion = cliente.ubicacionId
      ? await this.ubicacionRepository.findOne({
          where: { id: cliente.ubicacionId },
        })
      : null;
    const ubicacionLabel = ubicacion
      ? `${ubicacion.municipioProvincia}, ${ubicacion.departamento}`
      : null;

    const estadosProcesoCerrados = [EstadoProceso.CERRADO, EstadoProceso.DESCARTADO];
    const estadosProyeccionCerrados = [
      EstadoProyeccion.PUBLICADO,
      EstadoProyeccion.CERRADO,
    ];

    const procesos = await this.procesoRepository.find({
      where: { empresaClienteId: clienteId, eliminado: false },
      order: { fechaCreacion: 'DESC' },
      take: 50,
    });

    const procesosActivos = procesos.filter(
      (proceso) => !estadosProcesoCerrados.includes(proceso.estado),
    );

    const cuantiaTotal = procesosActivos.reduce(
      (sum, proceso) => sum + Number(proceso.cuantia),
      0,
    );

    const proyecciones = await this.proyeccionRepository.find({
      where: { empresaClienteId: clienteId, eliminado: false },
      order: { fechaEstimadaPublicacion: 'ASC' },
      take: 50,
    });

    const proyeccionesAbiertas = proyecciones.filter(
      (proyeccion) => !estadosProyeccionCerrados.includes(proyeccion.estado),
    );

    const totalContactos = await this.contactoRepository.count({
      where: { clienteId, eliminado: false },
    });

    const vencidosRows: Array<{ total: string | number }> =
      await this.relacionamientoRepository.query(
        `SELECT COUNT(*) AS total
         FROM vista_relacionamientos_vencidos v
         INNER JOIN relacionamientos r ON r.id = v.id
         INNER JOIN contactos co ON co.id = r.contacto_id
         WHERE co.cliente_id = ?`,
        [clienteId],
      );
    const relacionamientosVencidos = Number(vencidosRows[0]?.total ?? 0);

    const vencidoIds = new Set(
      (
        (await this.relacionamientoRepository.query(
          `SELECT v.id
           FROM vista_relacionamientos_vencidos v
           INNER JOIN relacionamientos r ON r.id = v.id
           INNER JOIN contactos co ON co.id = r.contacto_id
           WHERE co.cliente_id = ?`,
          [clienteId],
        )) as Array<{ id: number | string }>
      ).map((row) => Number(row.id)),
    );

    const relacionamientos = await this.relacionamientoRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.contacto', 'co')
      .where('co.cliente_id = :clienteId', { clienteId })
      .andWhere('r.eliminado = false')
      .orderBy('r.fecha_mensaje', 'DESC')
      .take(50)
      .getMany();

    return {
      cliente: this.toResponse(cliente),
      ubicacionLabel,
      resumen: {
        procesosActivos: procesosActivos.length,
        cuantiaTotal: cuantiaTotal.toFixed(2),
        proyeccionesAbiertas: proyeccionesAbiertas.length,
        relacionamientosVencidos,
        totalContactos,
      },
      procesos: procesos.map((proceso) => ({
        id: Number(proceso.id),
        codigo: proceso.codigo,
        idDigitado: proceso.idDigitado,
        estado: proceso.estado,
        cuantia: proceso.cuantia,
        moneda: proceso.moneda,
        fechaCierre: proceso.fechaCierre ?? null,
      })),
      proyecciones: proyecciones.map((proyeccion) => ({
        id: Number(proyeccion.id),
        anioProyectado: proyeccion.anioProyectado,
        estado: proyeccion.estado,
        mercado: proyeccion.mercado,
        valorVenta: proyeccion.valorVenta,
        valorFacturacion: proyeccion.valorFacturacion,
        fechaEstimadaPublicacion: proyeccion.fechaEstimadaPublicacion,
      })),
      relacionamientos: relacionamientos.map((rel) => ({
        id: Number(rel.id),
        contactoNombre: rel.contacto.nombre,
        canal: rel.canal,
        fechaMensaje: rel.fechaMensaje,
        resultado: rel.resultado,
        vencido: vencidoIds.has(Number(rel.id)),
      })),
    };
  }

  toResponse(cliente: Cliente): ClienteResponseDto {
    return {
      id: cliente.id,
      empresa: cliente.empresa,
      paisId: cliente.paisId,
      ubicacionId: cliente.ubicacionId,
      segmento: cliente.segmento,
      segmentoOtro: cliente.segmentoOtro,
      fechaCreacion: cliente.fechaCreacion,
    };
  }
}
