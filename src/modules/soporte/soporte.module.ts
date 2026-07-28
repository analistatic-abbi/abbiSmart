import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { MailModule } from '../mail/mail.module';
import { SoporteController } from './soporte.controller';
import { SoporteService } from './soporte.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Pais]), MailModule],
  controllers: [SoporteController],
  providers: [SoporteService],
})
export class SoporteModule {}
