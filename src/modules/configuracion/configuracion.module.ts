import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionSistema } from '../../database/entities/configuracion-sistema.entity';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionSistema])],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
