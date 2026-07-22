import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { ConfiguracionService } from './configuracion.service';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@ApiTags('Configuración')
@ApiBearerAuth()
@Controller('configuracion')
@Roles(Rol.ADMINISTRADOR)
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar parámetros del sistema (REL-007, SGP-006, TRX-014)',
  })
  async findAll() {
    const data = await this.configuracionService.findAll();

    return {
      message: 'Configuración obtenida correctamente',
      data,
    };
  }

  @Get(':clave')
  @ApiOperation({ summary: 'Obtener un parámetro por clave' })
  async findByClave(@Param('clave') clave: string) {
    const configuracion = await this.configuracionService.findByClave(clave);

    return {
      message: 'Parámetro obtenido correctamente',
      configuracion,
    };
  }

  @Patch(':clave')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar valor de un parámetro' })
  async updateValor(
    @Param('clave') clave: string,
    @Body() dto: UpdateConfiguracionDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const configuracion = await this.configuracionService.updateValor(
      clave,
      dto,
      actor.userId,
    );

    return {
      message: 'Parámetro actualizado correctamente',
      configuracion,
    };
  }
}
