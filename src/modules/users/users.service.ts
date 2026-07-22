import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ActivationService } from '../auth/activation.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersQueryDto } from './dto/users-query.dto';

export interface CreateUserResult {
  usuario: UserResponseDto;
  devActivationToken?: string;
}

export interface PasswordResetRequestResult {
  message: string;
  devResetToken?: string;
}

export interface UsersPage {
  data: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly activationService: ActivationService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: UsersQueryDto = {}): Promise<UsersPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.usuarioRepository
      .createQueryBuilder('u')
      .where('u.eliminado = false');

    if (query.search) {
      qb.andWhere('(u.nombre LIKE :search OR u.correo LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.rol) {
      qb.andWhere('u.rol = :rol', { rol: query.rol });
    }

    if (query.paisId) {
      qb.andWhere('u.pais_id = :paisId', { paisId: query.paisId });
    }

    qb.orderBy('u.fecha_creacion', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [usuarios, total] = await qb.getManyAndCount();

    return {
      data: usuarios.map((usuario) => UserResponseDto.fromEntity(usuario)),
      total,
      page,
      limit,
    };
  }

  async findById(id: number): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { id, eliminado: false },
    });
  }

  async findByCorreo(correo: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({
      where: { correo, eliminado: false },
    });
  }

  async existsByCorreo(correo: string): Promise<boolean> {
    const count = await this.usuarioRepository.count({
      where: { correo, eliminado: false },
    });
    return count > 0;
  }

  async findAllPaisesActivos(): Promise<Pais[]> {
    return this.paisRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async createUser(
    dto: CreateUserDto,
    actorUserId?: number,
  ): Promise<CreateUserResult> {
    if (!dto.paisId) {
      throw new BusinessException(
        ErrorCode.PAIS_REQUERIDO,
        'El país es obligatorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (await this.existsByCorreo(dto.correo)) {
      throw new BusinessException(
        ErrorCode.CORREO_YA_REGISTRADO,
        'El correo electrónico ya está registrado',
        HttpStatus.CONFLICT,
      );
    }

    await this.validatePaisActivo(dto.paisId);

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      correo: dto.correo,
      rol: dto.rol,
      paisId: dto.paisId,
      estado: EstadoUsuario.INACTIVO,
      passwordHash: null,
      eliminado: false,
    });

    const saved = await this.usuarioRepository.save(usuario);
    const rawToken = await this.activationService.createActivationToken(
      saved.id,
    );

    await this.mailService.sendActivationEmail(
      saved.correo,
      saved.nombre,
      rawToken,
    );

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.USUARIO_CREAR,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: saved.id,
      valorNuevo: JSON.stringify({
        correo: saved.correo,
        rol: saved.rol,
        paisId: saved.paisId,
      }),
    });

    return {
      usuario: UserResponseDto.fromEntity(saved),
      ...(this.mailService.shouldExposeDevTokens()
        ? { devActivationToken: rawToken }
        : {}),
    };
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
    actorUserId?: number,
  ): Promise<UserResponseDto> {
    const usuario = await this.getUsuarioOrThrow(id);
    const previousRol = usuario.rol;
    const previousNombre = usuario.nombre;
    const previousPaisId = usuario.paisId;
    const nextRol = dto.rol ?? usuario.rol;
    const nextPaisId =
      dto.paisId !== undefined ? dto.paisId : usuario.paisId;

    if (!nextPaisId) {
      throw new BusinessException(
        ErrorCode.PAIS_REQUERIDO,
        'El país es obligatorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.validatePaisActivo(nextPaisId);

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre;
    }

    usuario.rol = nextRol;
    usuario.paisId = nextPaisId;

    const saved = await this.usuarioRepository.save(usuario);

    if (dto.rol !== undefined && dto.rol !== previousRol) {
      await this.auditService.log({
        usuarioId: actorUserId ?? null,
        accion: AuditAccion.USUARIO_EDITAR,
        entidadTipo: AuditEntidadTipo.USUARIO,
        entidadId: saved.id,
        campo: 'rol',
        valorAnterior: previousRol,
        valorNuevo: saved.rol,
      });
    }

    if (dto.nombre !== undefined && dto.nombre !== previousNombre) {
      await this.auditService.log({
        usuarioId: actorUserId ?? null,
        accion: AuditAccion.USUARIO_EDITAR,
        entidadTipo: AuditEntidadTipo.USUARIO,
        entidadId: saved.id,
        campo: 'nombre',
        valorAnterior: previousNombre,
        valorNuevo: saved.nombre,
      });
    }

    if (
      dto.paisId !== undefined &&
      Number(dto.paisId) !== Number(previousPaisId)
    ) {
      await this.auditService.log({
        usuarioId: actorUserId ?? null,
        accion: AuditAccion.USUARIO_EDITAR,
        entidadTipo: AuditEntidadTipo.USUARIO,
        entidadId: saved.id,
        campo: 'pais_id',
        valorAnterior: previousPaisId ? String(previousPaisId) : null,
        valorNuevo: saved.paisId ? String(saved.paisId) : null,
      });
    }

    return UserResponseDto.fromEntity(saved);
  }

  async requestPasswordReset(
    id: number,
    actorUserId?: number,
  ): Promise<PasswordResetRequestResult> {
    const usuario = await this.getUsuarioOrThrow(id);

    usuario.passwordHash = null;
    usuario.estado = EstadoUsuario.INACTIVO;
    usuario.intentosFallidos = 0;
    await this.usuarioRepository.save(usuario);

    const rawToken = await this.activationService.createActivationToken(
      usuario.id,
    );

    await this.mailService.sendPasswordResetEmail(
      usuario.correo,
      usuario.nombre,
      rawToken,
    );

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.RESET_PASSWORD_SOLICITUD,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
    });

    return {
      message: 'Se envió el correo de restablecimiento de contraseña',
      ...(this.mailService.shouldExposeDevTokens()
        ? { devResetToken: rawToken }
        : {}),
    };
  }

  async reenviarActivacion(
    id: number,
    actorUserId?: number,
  ): Promise<PasswordResetRequestResult> {
    const usuario = await this.getUsuarioOrThrow(id);

    if (usuario.estado === EstadoUsuario.ACTIVO) {
      throw new BusinessException(
        ErrorCode.USUARIO_YA_ACTIVO,
        'El usuario ya está activo',
        HttpStatus.BAD_REQUEST,
      );
    }

    usuario.passwordHash = null;
    usuario.estado = EstadoUsuario.INACTIVO;
    usuario.intentosFallidos = 0;
    await this.usuarioRepository.save(usuario);

    const rawToken = await this.activationService.createActivationToken(
      usuario.id,
    );

    await this.mailService.sendActivationEmail(
      usuario.correo,
      usuario.nombre,
      rawToken,
    );

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.USUARIO_EDITAR,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
      campo: 'activacion',
      valorNuevo: 'reenvio',
    });

    return {
      message: 'Se envió un nuevo enlace de activación',
      ...(this.mailService.shouldExposeDevTokens()
        ? { devResetToken: rawToken }
        : {}),
    };
  }

  async unlockUser(
    id: number,
    actorUserId?: number,
  ): Promise<PasswordResetRequestResult> {
    const usuario = await this.getUsuarioOrThrow(id);

    if (usuario.estado !== EstadoUsuario.BLOQUEADA) {
      throw new BusinessException(
        ErrorCode.CUENTA_NO_BLOQUEADA,
        'La cuenta no está bloqueada',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.USUARIO_DESBLOQUEAR,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
    });

    return this.reenviarActivacion(id, actorUserId);
  }

  async deactivateUser(
    id: number,
    actorUserId?: number,
  ): Promise<UserResponseDto> {
    const usuario = await this.getUsuarioOrThrow(id);
    const estadoAnterior = usuario.estado;

    if (usuario.estado === EstadoUsuario.INACTIVO) {
      return UserResponseDto.fromEntity(usuario);
    }

    usuario.estado = EstadoUsuario.INACTIVO;
    const saved = await this.usuarioRepository.save(usuario);

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.USUARIO_DESACTIVAR,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: saved.id,
      valorAnterior: estadoAnterior,
      valorNuevo: EstadoUsuario.INACTIVO,
    });

    return UserResponseDto.fromEntity(saved);
  }

  private async getUsuarioOrThrow(id: number): Promise<Usuario> {
    const usuario = await this.findById(id);

    if (!usuario) {
      throw new BusinessException(
        ErrorCode.USUARIO_NO_ENCONTRADO,
        'Usuario no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return usuario;
  }

  private async validatePaisActivo(paisId: number): Promise<void> {
    const pais = await this.paisRepository.findOne({
      where: { id: paisId, activo: true },
    });

    if (!pais) {
      throw new BusinessException(
        ErrorCode.PAIS_NO_ENCONTRADO,
        'El país indicado no existe o no está activo',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
