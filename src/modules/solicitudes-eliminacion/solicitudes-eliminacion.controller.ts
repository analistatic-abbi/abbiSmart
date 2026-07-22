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
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CreateSolicitudEliminacionDto } from './dto/solicitud-eliminacion.dto';
import { SolicitudesEliminacionService } from './solicitudes-eliminacion.service';

@ApiTags('Solicitudes de eliminación')
@ApiBearerAuth()
@Controller('solicitudes-eliminacion')
export class SolicitudesEliminacionController {
  constructor(
    private readonly solicitudesService: SolicitudesEliminacionService,
  ) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar solicitudes de eliminación pendientes (TRX-012)' })
  async findPendientes() {
    const data = await this.solicitudesService.findPendientes();

    return {
      message: 'Solicitudes de eliminación obtenidas correctamente',
      data,
    };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Solicitar eliminación de una entidad (TRX-012)' })
  async create(
    @Body() dto: CreateSolicitudEliminacionDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const solicitud = await this.solicitudesService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Solicitud de eliminación registrada correctamente',
      solicitud,
    };
  }

  @Patch(':id/aprobar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Aprobar solicitud de eliminación (Admin)' })
  async aprobar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const solicitud = await this.solicitudesService.aprobar(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Solicitud aprobada y entidad eliminada correctamente',
      solicitud,
    };
  }

  @Patch(':id/rechazar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Rechazar solicitud de eliminación (Admin)' })
  async rechazar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const solicitud = await this.solicitudesService.rechazar(
      id,
      actor.userId,
      actor.rol as Rol,
    );

    return {
      message: 'Solicitud rechazada correctamente',
      solicitud,
    };
  }
}
