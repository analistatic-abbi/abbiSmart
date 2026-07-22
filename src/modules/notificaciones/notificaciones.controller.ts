import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Bandeja de notificaciones del usuario (TRX-015)' })
  async findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('soloNoLeidas') soloNoLeidas?: string,
  ) {
    const data = await this.notificacionesService.findByUsuario(
      user.userId,
      soloNoLeidas === 'true',
    );

    return {
      message: 'Notificaciones obtenidas correctamente',
      data,
    };
  }

  @Patch('leer-todas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async marcarTodasLeidas(@CurrentUser() user: AuthUserPayload) {
    const total = await this.notificacionesService.marcarTodasLeidas(
      user.userId,
    );

    return {
      message: 'Notificaciones marcadas como leídas',
      total,
    };
  }

  @Patch(':id/leer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  async marcarLeida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const notificacion = await this.notificacionesService.marcarLeida(
      id,
      user.userId,
    );

    return {
      message: 'Notificación marcada como leída',
      notificacion,
    };
  }
}
