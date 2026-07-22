import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proceso } from '../../database/entities/proceso.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Proceso])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
