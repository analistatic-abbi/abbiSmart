import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuditService } from '../audit/audit.service';
import {
  AuthUserPayload,
  JwtPayload,
} from './interfaces/auth-user-payload.interface';
import { LoginUsuarioInfo } from './login.service';
import { SesionService, SessionCreated } from './sesion.service';

export interface AuthTokensResponse {
  accessToken: string;
  expiresIn: string;
  usuario: LoginUsuarioInfo;
  session: {
    id: number;
    paisSesionId: number;
    fechaExpiracion: Date;
  };
}

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sesionService: SesionService,
    private readonly configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditService: AuditService,
  ) {}

  async issueTokensForSession(
    usuario: LoginUsuarioInfo,
    session: SessionCreated,
    res: Response,
  ): Promise<AuthTokensResponse> {
    const accessToken = await this.generateAccessToken({
      sub: usuario.id,
      rol: usuario.rol,
      sessionId: session.id,
      paisSesionId: session.paisSesionId,
      jti: randomUUID(),
    });

    this.setRefreshCookie(res, session.refreshToken);

    return {
      accessToken,
      expiresIn:
        this.configService.get<string>('jwt.accessExpiresIn') ?? '15m',
      usuario,
      session: {
        id: session.id,
        paisSesionId: session.paisSesionId,
        fechaExpiracion: session.fechaExpiracion,
      },
    };
  }

  async refreshTokens(
    rawRefreshToken: string,
    res: Response,
  ): Promise<AuthTokensResponse> {
    const sesion =
      await this.sesionService.findActiveByRefreshToken(rawRefreshToken);

    if (!sesion) {
      throw new BusinessException(
        ErrorCode.AUTH_SESION_INVALIDA,
        'La sesión no es válida o expiró',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: sesion.usuarioId, eliminado: false },
    });

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      await this.sesionService.invalidateSession(sesion.id);
      throw new BusinessException(
        ErrorCode.AUTH_SESION_INVALIDA,
        'La sesión no es válida',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const rotated = await this.sesionService.rotateRefreshToken(
      sesion.id,
      rawRefreshToken,
    );

    const usuarioInfo: LoginUsuarioInfo = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };

    return this.issueTokensForSession(usuarioInfo, rotated, res);
  }

  async logout(sessionId: number, userId: number, res: Response): Promise<void> {
    await this.sesionService.invalidateSession(sessionId);
    this.clearRefreshCookie(res);

    await this.auditService.log({
      usuarioId: userId,
      accion: AuditAccion.LOGOUT,
      entidadTipo: AuditEntidadTipo.AUTH,
      entidadId: userId,
    });
  }

  getRefreshTokenFromRequest(req: Request): string | undefined {
    const cookieName =
      this.configService.get<string>('cookie.refreshName') ?? 'abbi_refresh';
    return req.cookies?.[cookieName] as string | undefined;
  }

  setRefreshCookie(res: Response, rawRefreshToken: string): void {
    res.cookie(
      this.configService.get<string>('cookie.refreshName') ?? 'abbi_refresh',
      rawRefreshToken,
      {
        httpOnly: true,
        secure: this.configService.get<boolean>('cookie.secure') ?? false,
        sameSite:
          this.configService.get<'strict' | 'lax' | 'none'>(
            'cookie.sameSite',
          ) ?? 'strict',
        path:
          this.configService.get<string>('cookie.refreshPath') ??
          '/api/v1/auth',
        maxAge:
          (this.configService.get<number>('cookie.refreshMaxAge') ?? 604800) *
          1000,
        domain: this.configService.get<string>('cookie.domain') || undefined,
      },
    );
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(
      this.configService.get<string>('cookie.refreshName') ?? 'abbi_refresh',
      {
        httpOnly: true,
        secure: this.configService.get<boolean>('cookie.secure') ?? false,
        sameSite:
          this.configService.get<'strict' | 'lax' | 'none'>(
            'cookie.sameSite',
          ) ?? 'strict',
        path:
          this.configService.get<string>('cookie.refreshPath') ??
          '/api/v1/auth',
        domain: this.configService.get<string>('cookie.domain') || undefined,
      },
    );
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  toAuthUserPayload(payload: JwtPayload): AuthUserPayload {
    return {
      userId: payload.sub,
      rol: payload.rol,
      sessionId: payload.sessionId,
      paisSesionId: payload.paisSesionId,
    };
  }
}
