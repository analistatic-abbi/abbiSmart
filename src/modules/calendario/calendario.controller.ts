import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CalendarioService } from './calendario.service';
import { CalendarioEventosQueryDto } from './dto/calendario-eventos.dto';

@ApiTags('Calendario')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @Get('eventos')
  @ApiOperation({ summary: 'Eventos unificados del calendario por año y tipo' })
  async getEventos(
    @Query() query: CalendarioEventosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.calendarioService.getEventos(query, user.paisSesionId!);

    return {
      message: 'Eventos del calendario obtenidos correctamente',
      data,
    };
  }
}
