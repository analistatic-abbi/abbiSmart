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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  CreateParametroDto,
  ParametrosQueryDto,
  UpdateParametroDto,
} from './dto/parametro.dto';
import { ParametrosService } from './parametros.service';

@ApiTags('Procesos — Parámetros financieros')
@ApiBearerAuth()
@Controller('parametros')
export class ParametrosController {
  constructor(private readonly parametrosService: ParametrosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar parámetros financieros del país de sesión (PAR-001)' })
  async findAll(
    @Query() query: ParametrosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.parametrosService.findAll(
      query,
      user.paisSesionId!,
    );

    return {
      message: 'Parámetros financieros obtenidos correctamente',
      ...result,
    };
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Historial de cambios del parámetro (PAR-003)' })
  async getHistorial(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const historial = await this.parametrosService.getHistorial(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Historial del parámetro obtenido correctamente',
      data: historial,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener parámetro financiero por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const parametro = await this.parametrosService.findById(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Parámetro financiero obtenido correctamente',
      parametro,
    };
  }

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear parámetro financiero (PAR-003, solo Admin)' })
  async create(
    @Body() dto: CreateParametroDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const parametro = await this.parametrosService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Parámetro financiero creado correctamente',
      parametro,
    };
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar parámetro financiero (PAR-003, solo Admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParametroDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const parametro = await this.parametrosService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Parámetro financiero actualizado correctamente',
      parametro,
    };
  }
}
