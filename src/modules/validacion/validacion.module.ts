import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../common/authorization.module';
import { Proceso } from '../../database/entities/proceso.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ValidacionProceso } from '../../database/entities/validacion-proceso.entity';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { ValidacionController } from './validacion.controller';
import { ValidacionService } from './validacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ValidacionProceso, Usuario, Proceso]),
    ProcesosModule,
    AuditModule,
    MailModule,
    AuthorizationModule,
  ],
  controllers: [ValidacionController],
  providers: [ValidacionService],
})
export class ValidacionModule {}
