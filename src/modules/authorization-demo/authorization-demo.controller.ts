import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaisSesion } from '../../common/decorators/pais-sesion.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';

@Controller('authorization-demo')
export class AuthorizationDemoController {
  @Get('context')
  getContext(
    @CurrentUser() user: AuthUserPayload,
    @PaisSesion() paisSesionId: number,
  ) {
    return {
      userId: user.userId,
      rol: user.rol,
      sessionId: user.sessionId,
      paisSesionId,
    };
  }

  @Get('lectura')
  lectura(@CurrentUser() user: AuthUserPayload) {
    return {
      message: 'Acceso de lectura permitido',
      rol: user.rol,
    };
  }

  @Post('escritura')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  escritura(
    @CurrentUser() user: AuthUserPayload,
    @PaisSesion() paisSesionId: number,
  ) {
    return {
      message: 'Escritura permitida',
      rol: user.rol,
      paisSesionId,
    };
  }

  @Get('validacion')
  @Roles(Rol.VALIDADOR, Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA)
  moduloValidacion(@CurrentUser() user: AuthUserPayload) {
    return {
      message: 'Acceso al módulo de validación',
      rol: user.rol,
    };
  }

  @Post('validacion')
  @Roles(Rol.VALIDADOR)
  @HttpCode(HttpStatus.OK)
  ejecutarValidacion(@CurrentUser() user: AuthUserPayload) {
    return {
      message: 'Validación ejecutada',
      validadorId: user.userId,
    };
  }
}
