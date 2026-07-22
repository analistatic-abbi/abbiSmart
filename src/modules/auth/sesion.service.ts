import { HttpStatus, Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';

import { randomBytes } from 'crypto';

import { LessThan, Repository } from 'typeorm';

import { BusinessException } from '../../common/exceptions/business.exception';

import { ErrorCode } from '../../common/exceptions/error-codes.enum';

import { hashSha256 } from '../../common/utils/crypto.util';

import { SesionUsuario } from '../../database/entities/sesion-usuario.entity';



export interface SessionCreated {

  id: number;

  paisSesionId: number;

  refreshToken: string;

  fechaExpiracion: Date;

}



@Injectable()

export class SesionService {

  constructor(

    @InjectRepository(SesionUsuario)

    private readonly sesionRepository: Repository<SesionUsuario>,

    private readonly configService: ConfigService,

  ) {}



  async createSession(

    usuarioId: number,

    paisSesionId: number,

  ): Promise<SessionCreated> {

    const refreshToken = randomBytes(32).toString('hex');

    const fechaExpiracion = this.calculateExpirationDate();



    const sesion = this.sesionRepository.create({

      usuarioId,

      paisSesionId,

      tokenSesion: hashSha256(refreshToken),

      fechaExpiracion,

    });



    const saved = await this.sesionRepository.save(sesion);



    return {

      id: saved.id,

      paisSesionId: saved.paisSesionId,

      refreshToken,

      fechaExpiracion: saved.fechaExpiracion,

    };

  }



  async findActiveById(sessionId: number): Promise<SesionUsuario | null> {

    return this.sesionRepository.findOne({

      where: { id: sessionId },

    });

  }



  async findActiveByRefreshToken(

    rawRefreshToken: string,

  ): Promise<SesionUsuario | null> {

    const sesion = await this.sesionRepository.findOne({

      where: { tokenSesion: hashSha256(rawRefreshToken) },

    });



    if (!sesion || sesion.fechaExpiracion < new Date()) {

      return null;

    }



    return sesion;

  }



  async rotateRefreshToken(

    sessionId: number,

    currentRawToken: string,

  ): Promise<SessionCreated> {

    const sesion = await this.findActiveByRefreshToken(currentRawToken);



    if (!sesion || Number(sesion.id) !== Number(sessionId)) {

      throw new BusinessException(

        ErrorCode.AUTH_SESION_INVALIDA,

        'La sesión no es válida',

        HttpStatus.UNAUTHORIZED,

      );

    }



    const newRefreshToken = randomBytes(32).toString('hex');

    sesion.tokenSesion = hashSha256(newRefreshToken);

    sesion.fechaExpiracion = this.calculateExpirationDate();



    const saved = await this.sesionRepository.save(sesion);



    return {

      id: saved.id,

      paisSesionId: saved.paisSesionId,

      refreshToken: newRefreshToken,

      fechaExpiracion: saved.fechaExpiracion,

    };

  }



  async invalidateSession(sessionId: number): Promise<void> {
    await this.sesionRepository.delete({ id: sessionId });
  }

  async invalidateAllUserSessions(usuarioId: number): Promise<void> {
    await this.sesionRepository.delete({ usuarioId });
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.sesionRepository.delete({
      fechaExpiracion: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  private calculateExpirationDate(): Date {

    const sessionDays =

      this.configService.get<number>('security.sessionExpiresDays') ?? 7;

    const fechaExpiracion = new Date();

    fechaExpiracion.setDate(fechaExpiracion.getDate() + sessionDays);

    return fechaExpiracion;

  }

}


