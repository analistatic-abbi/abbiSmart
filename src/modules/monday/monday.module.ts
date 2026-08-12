import { Module } from '@nestjs/common';
import { MondayService } from './monday.service';

@Module({
  providers: [MondayService],
  exports: [MondayService],
})
export class MondayModule {}
