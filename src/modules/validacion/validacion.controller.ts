import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { AsignarValidadoresDto, VeredictoValidacionDto } from '../procesos/dto/proceso.dto';
import { ValidacionService } from './validacion.service';

@ApiTags('Procesos — Validación')
@ApiBearerAuth()
@Controller()
export class ValidacionController {
  constructor(private readonly validacionService: ValidacionService) {}

  @Get('validacion/pendientes')
  @ApiOperation({ summary: 'Bandeja de procesos pendientes por validar (VAL-005)' })
  async findPendientes(@CurrentUser() user: AuthUserPayload) {
    const data = await this.validacionService.findPendientes(
      user.userId,
      user.paisSesionId!,
    );

    return {
      message: 'Procesos pendientes de validación obtenidos correctamente',
      data,
    };
  }

  @Post('procesos/:id/validadores')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Asignar validadores a un proceso (VAL-001, VAL-006)' })
  async asignarValidadores(
    @Param('id', ParseIntPipe) procesoId: number,
    @Body() dto: AsignarValidadoresDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.validacionService.asignarValidadores(
      procesoId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Validadores asignados correctamente',
    };
  }

  @Patch('validacion/:id/veredicto')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Registrar veredicto de validación (VAL-004)' })
  async registrarVeredicto(
    @Param('id', ParseIntPipe) validacionId: number,
    @Body() dto: VeredictoValidacionDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.validacionService.registrarVeredicto(
      validacionId,
      dto,
      actor.userId,
      actor.rol as Rol,
    );

    return {
      message: 'Veredicto registrado correctamente',
    };
  }
}
