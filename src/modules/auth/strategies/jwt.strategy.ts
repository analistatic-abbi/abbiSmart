import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../../common/enums/estado-usuario.enum';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { Usuario } from '../../../database/entities/usuario.entity';
import {
  AuthUserPayload,
  JwtPayload,
} from '../interfaces/auth-user-payload.interface';
import { SesionService } from '../sesion.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly sesionService: SesionService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUserPayload> {
    const sesion = await this.sesionService.findActiveById(payload.sessionId);

    if (
      !sesion ||
      sesion.fechaExpiracion < new Date() ||
      Number(sesion.usuarioId) !== Number(payload.sub) ||
      Number(sesion.paisSesionId) !== Number(payload.paisSesionId)
    ) {
      throw new UnauthorizedException({
        errorCode: ErrorCode.AUTH_SESION_INVALIDA,
        message: 'La sesión no es válida',
      });
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub, eliminado: false },
    });

    if (!usuario || usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new UnauthorizedException({
        errorCode: ErrorCode.AUTH_SESION_INVALIDA,
        message: 'La sesión no es válida',
      });
    }

    return {
      userId: payload.sub,
      rol: payload.rol,
      sessionId: payload.sessionId,
      paisSesionId: payload.paisSesionId,
    };
  }
}
