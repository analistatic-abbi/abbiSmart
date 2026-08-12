import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { EnviarSoporteDto } from './dto/enviar-soporte.dto';
import { SoporteService } from './soporte.service';

@ApiTags('Soporte')
@ApiBearerAuth()
@Controller('soporte')
export class SoporteController {
  constructor(private readonly soporteService: SoporteService) {}

  @Post('mensaje')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar solicitud de soporte en Monday HelpDesk' })
  async enviarMensaje(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: EnviarSoporteDto,
  ) {
    const result = await this.soporteService.enviarMensaje(user, dto);
    return result;
  }
}
