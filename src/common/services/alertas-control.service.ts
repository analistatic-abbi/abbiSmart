import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertaEnviada } from '../../database/entities/alerta-enviada.entity';

@Injectable()
export class AlertasControlService {
  constructor(
    @InjectRepository(AlertaEnviada)
    private readonly alertaRepository: Repository<AlertaEnviada>,
  ) {}

  async yaEnviadaProyeccion(
    proyeccionId: number,
    umbral: string,
  ): Promise<boolean> {
    const row = await this.alertaRepository.findOne({
      where: { proyeccionId, umbral },
    });

    return Boolean(row);
  }

  async registrarProyeccion(
    proyeccionId: number,
    umbral: string,
  ): Promise<void> {
    await this.alertaRepository.save(
      this.alertaRepository.create({
        proyeccionId,
        relacionamientoId: null,
        umbral,
      }),
    );
  }

  async yaEnviadaRelacionamiento(relacionamientoId: number): Promise<boolean> {
    const row = await this.alertaRepository.findOne({
      where: { relacionamientoId, umbral: 'vencimiento' },
    });

    return Boolean(row);
  }

  async registrarRelacionamiento(relacionamientoId: number): Promise<void> {
    await this.alertaRepository.save(
      this.alertaRepository.create({
        proyeccionId: null,
        relacionamientoId,
        umbral: 'vencimiento',
      }),
    );
  }
}
