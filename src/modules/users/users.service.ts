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

export interface CreateUserResult {
  usuario: UserResponseDto;
  devActivationToken?: string;
}

export interface PasswordResetRequestResult {
  message: string;
  devResetToken?: string;
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
    if (dto.rol === Rol.OPERADOR && !dto.paisId) {
      throw new BusinessException(
        ErrorCode.PAIS_REQUERIDO_OPERADOR,
        'El país es obligatorio para el rol Operador',
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

    if (dto.paisId) {
      await this.validatePaisActivo(dto.paisId);
    }

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      correo: dto.correo,
      rol: dto.rol,
      paisId: dto.paisId ?? null,
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

    if (nextRol === Rol.OPERADOR && !nextPaisId) {
      throw new BusinessException(
        ErrorCode.PAIS_REQUERIDO_OPERADOR,
        'El país es obligatorio para el rol Operador',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nextPaisId) {
      await this.validatePaisActivo(nextPaisId);
    }

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre;
    }

    usuario.rol = nextRol;
    usuario.paisId = nextRol === Rol.OPERADOR ? nextPaisId : null;

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

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new BusinessException(
        ErrorCode.USUARIO_NO_ACTIVO,
        'Solo se puede restablecer la contraseña de usuarios activos',
        HttpStatus.BAD_REQUEST,
      );
    }

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

  async unlockUser(
    id: number,
    actorUserId?: number,
  ): Promise<UserResponseDto> {
    const usuario = await this.getUsuarioOrThrow(id);

    if (usuario.estado !== EstadoUsuario.BLOQUEADA) {
      throw new BusinessException(
        ErrorCode.CUENTA_NO_BLOQUEADA,
        'La cuenta no está bloqueada',
        HttpStatus.BAD_REQUEST,
      );
    }

    usuario.estado = EstadoUsuario.ACTIVO;
    usuario.intentosFallidos = 0;

    const saved = await this.usuarioRepository.save(usuario);

    await this.auditService.log({
      usuarioId: actorUserId ?? null,
      accion: AuditAccion.USUARIO_DESBLOQUEAR,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: saved.id,
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
