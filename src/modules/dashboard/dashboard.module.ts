import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pais } from '../../database/entities/pais.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { MetaAnual } from '../../database/entities/meta-anual.entity';
import { ReporteGenerado } from '../../database/entities/reporte-generado.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ProyeccionesModule } from '../proyecciones/proyecciones.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proceso, Proyeccion, ReporteGenerado, Pais, MetaAnual]),
    NotificacionesModule,
    ProyeccionesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
