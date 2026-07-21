import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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
import { AuditService } from '../audit/audit.service';
import { PreAuthService } from './pre-auth.service';
import { SesionService, SessionCreated } from './sesion.service';

export interface LoginUsuarioInfo {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface LoginWithSessionResult {
  requiresCountrySelection: false;
  usuario: LoginUsuarioInfo;
  session: SessionCreated;
}

export interface LoginPendingCountryResult {
  requiresCountrySelection: true;
  preAuthToken: string;
  usuario: LoginUsuarioInfo;
  paises: Pick<Pais, 'id' | 'nombre'>[];
}

export type LoginResult = LoginWithSessionResult | LoginPendingCountryResult;

export interface SelectCountryResult {
  usuario: LoginUsuarioInfo;
  session: SessionCreated;
}

@Injectable()
export class LoginService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    private readonly preAuthService: PreAuthService,
    private readonly sesionService: SesionService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(correo: string, password: string): Promise<LoginResult> {
    const usuario = await this.usuarioRepository.findOne({
      where: { correo, eliminado: false },
    });

    if (!usuario) {
      await this.auditService.log({
        accion: AuditAccion.LOGIN_FALLIDO,
        entidadTipo: AuditEntidadTipo.AUTH,
      });

      throw new BusinessException(
        ErrorCode.AUTH_CREDENCIALES_INVALIDAS,
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (usuario.estado === EstadoUsuario.BLOQUEADA) {
      throw new BusinessException(
        ErrorCode.AUTH_CUENTA_BLOQUEADA,
        'La cuenta está bloqueada. Contacte al administrador.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO || !usuario.passwordHash) {
      throw new BusinessException(
        ErrorCode.AUTH_CREDENCIALES_INVALIDAS,
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordValid = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValid) {
      const blocked = await this.handleFailedLogin(usuario);

      await this.auditService.log({
        usuarioId: usuario.id,
        accion: AuditAccion.LOGIN_FALLIDO,
        entidadTipo: AuditEntidadTipo.AUTH,
        entidadId: usuario.id,
      });

      if (blocked) {
        await this.auditService.log({
          usuarioId: usuario.id,
          accion: AuditAccion.CUENTA_BLOQUEADA,
          entidadTipo: AuditEntidadTipo.USUARIO,
          entidadId: usuario.id,
        });
      }

      throw new BusinessException(
        ErrorCode.AUTH_CREDENCIALES_INVALIDAS,
        'Credenciales inválidas',
        HttpStatus.UNAUTHORIZED,
      );
    }

    usuario.intentosFallidos = 0;
    await this.usuarioRepository.save(usuario);

    const usuarioInfo = this.toLoginUsuarioInfo(usuario);

    if (usuario.rol === Rol.OPERADOR) {
      if (!usuario.paisId) {
        throw new BusinessException(
          ErrorCode.PAIS_REQUERIDO_OPERADOR,
          'El operador no tiene país asignado',
          HttpStatus.BAD_REQUEST,
        );
      }

      const session = await this.sesionService.createSession(
        usuario.id,
        usuario.paisId,
      );

      await this.auditService.log({
        usuarioId: usuario.id,
        accion: AuditAccion.LOGIN,
        entidadTipo: AuditEntidadTipo.AUTH,
        entidadId: usuario.id,
        campo: 'pais_sesion',
        valorNuevo: String(usuario.paisId),
      });

      return {
        requiresCountrySelection: false,
        usuario: usuarioInfo,
        session,
      };
    }

    const paises = await this.paisRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    const preAuthToken = this.preAuthService.createToken(usuario.id);

    return {
      requiresCountrySelection: true,
      preAuthToken,
      usuario: usuarioInfo,
      paises: paises.map((p) => ({ id: p.id, nombre: p.nombre })),
    };
  }

  async selectCountry(
    usuarioId: number,
    paisId: number,
    preAuthToken: string,
  ): Promise<SelectCountryResult> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new BusinessException(
        ErrorCode.AUTH_PRE_AUTH_INVALIDO,
        'La autenticación previa no es válida',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (usuario.rol === Rol.OPERADOR) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'Los operadores no seleccionan país de sesión',
        HttpStatus.FORBIDDEN,
      );
    }

    const paises = await this.paisRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
    const paisValido = paises.some(
      (p) => Number(p.id) === Number(paisId),
    );

    if (!paisValido) {
      throw new BusinessException(
        ErrorCode.PAIS_SESION_INVALIDO,
        'El país seleccionado no es válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const session = await this.sesionService.createSession(usuarioId, paisId);
    this.preAuthService.revokeToken(preAuthToken);

    await this.auditService.log({
      usuarioId,
      accion: AuditAccion.LOGIN,
      entidadTipo: AuditEntidadTipo.AUTH,
      entidadId: usuarioId,
      campo: 'pais_sesion',
      valorNuevo: String(paisId),
    });

    return {
      usuario: this.toLoginUsuarioInfo(usuario),
      session,
    };
  }

  private async handleFailedLogin(usuario: Usuario): Promise<boolean> {
    const maxAttempts =
      this.configService.get<number>('security.maxLoginAttempts') ?? 5;

    usuario.intentosFallidos += 1;

    const blocked = usuario.intentosFallidos >= maxAttempts;

    if (blocked) {
      usuario.estado = EstadoUsuario.BLOQUEADA;
    }

    await this.usuarioRepository.save(usuario);
    return blocked;
  }

  private toLoginUsuarioInfo(usuario: Usuario): LoginUsuarioInfo {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  }
}
