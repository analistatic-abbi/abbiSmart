import { randomBytes } from 'crypto';
import { hashSha256 } from '../../common/utils/crypto.util';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { TokenActivacion } from '../../database/entities/token-activacion.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import { SesionService } from './sesion.service';

export interface ActivationResult {
  id: number;
  nombre: string;
  correo: string;
  estado: EstadoUsuario;
}

@Injectable()
export class ActivationService {
  constructor(
    @InjectRepository(TokenActivacion)
    private readonly tokenRepository: Repository<TokenActivacion>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly sesionService: SesionService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async createActivationToken(usuarioId: number): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresHours = this.configService.get<number>(
      'security.activationTokenExpiresHours',
    ) ?? 48;

    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + expiresHours);

    const tokenEntity = this.tokenRepository.create({
      usuarioId,
      token: tokenHash,
      fechaExpiracion,
      usado: false,
    });

    await this.tokenRepository.save(tokenEntity);
    return rawToken;
  }

  async activateAccount(
    rawToken: string,
    password: string,
  ): Promise<ActivationResult> {
    const tokenHash = this.hashToken(rawToken);
    const tokenEntity = await this.tokenRepository.findOne({
      where: { token: tokenHash },
    });

    if (!tokenEntity) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_INVALIDO,
        'El enlace de activación no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntity.usado) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_USADO,
        'El enlace de activación ya fue utilizado',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntity.fechaExpiracion < new Date()) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_EXPIRADO,
        'El enlace de activación ha expirado',
        HttpStatus.BAD_REQUEST,
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: tokenEntity.usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_INVALIDO,
        'El enlace de activación no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (usuario.estado === EstadoUsuario.ACTIVO) {
      throw new BusinessException(
        ErrorCode.USUARIO_YA_ACTIVO,
        'La cuenta ya está activa',
        HttpStatus.BAD_REQUEST,
      );
    }

    const bcryptRounds =
      this.configService.get<number>('security.bcryptRounds') ?? 12;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    usuario.passwordHash = passwordHash;
    usuario.estado = EstadoUsuario.ACTIVO;
    tokenEntity.usado = true;

    await this.usuarioRepository.save(usuario);
    await this.tokenRepository.save(tokenEntity);

    await this.auditService.log({
      usuarioId: usuario.id,
      accion: AuditAccion.ACTIVACION,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      estado: usuario.estado,
    };
  }

  async resetPasswordWithToken(
    rawToken: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(rawToken);
    const tokenEntity = await this.tokenRepository.findOne({
      where: { token: tokenHash },
    });

    if (!tokenEntity) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_INVALIDO,
        'El enlace no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntity.usado) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_USADO,
        'El enlace ya fue utilizado',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (tokenEntity.fechaExpiracion < new Date()) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_EXPIRADO,
        'El enlace ha expirado',
        HttpStatus.BAD_REQUEST,
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: tokenEntity.usuarioId, eliminado: false },
    });

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new BusinessException(
        ErrorCode.TOKEN_ACTIVACION_INVALIDO,
        'El enlace no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const bcryptRounds =
      this.configService.get<number>('security.bcryptRounds') ?? 12;
    usuario.passwordHash = await bcrypt.hash(password, bcryptRounds);
    tokenEntity.usado = true;

    await this.usuarioRepository.save(usuario);
    await this.tokenRepository.save(tokenEntity);
    await this.sesionService.invalidateAllUserSessions(usuario.id);

    await this.auditService.log({
      usuarioId: usuario.id,
      accion: AuditAccion.RESET_PASSWORD,
      entidadTipo: AuditEntidadTipo.USUARIO,
      entidadId: usuario.id,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  hashToken(rawToken: string): string {
    return hashSha256(rawToken);
  }
}
