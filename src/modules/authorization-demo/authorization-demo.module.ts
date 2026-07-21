import { Module } from '@nestjs/common';
import { AuthorizationDemoController } from './authorization-demo.controller';

@Module({
  controllers: [AuthorizationDemoController],
})
export class AuthorizationDemoModule {}
