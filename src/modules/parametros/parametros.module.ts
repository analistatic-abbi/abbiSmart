import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { AuditModule } from '../audit/audit.module';
import { ParametrosController } from './parametros.controller';
import { ParametrosService } from './parametros.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParametroFinanciero]), AuditModule],
  controllers: [ParametrosController],
  providers: [ParametrosService],
  exports: [ParametrosService],
})
export class ParametrosModule {}
