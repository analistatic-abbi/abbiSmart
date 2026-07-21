import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PaisSesionGuard } from './guards/pais-sesion.guard';
import { RolesGuard } from './guards/roles.guard';
import { WriteAccessGuard } from './guards/write-access.guard';
import { PermisosService } from './services/permisos.service';

@Global()
@Module({
  providers: [
    PermisosService,
    JwtAuthGuard,
    RolesGuard,
    PaisSesionGuard,
    WriteAccessGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PaisSesionGuard },
    { provide: APP_GUARD, useClass: WriteAccessGuard },
  ],
  exports: [PermisosService],
})
export class AuthorizationModule {}
