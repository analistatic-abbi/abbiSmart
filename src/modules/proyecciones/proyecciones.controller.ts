import {
  Body,
  Controller,
  Delete,
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
import { EliminarEntidadQueryDto } from '../../common/dto/eliminar-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  AsignarMercadoBatchDto,
  CreateProyeccionDto,
  ProyeccionesQueryDto,
  UpdateProyeccionDto,
  VincularProcesoResultanteDto,
} from './dto/proyeccion.dto';
import { ProyeccionesService } from './proyecciones.service';

@ApiTags('Proyecciones de mercado')
@ApiBearerAuth()
@Controller('proyecciones')
export class ProyeccionesController {
  constructor(private readonly proyeccionesService: ProyeccionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proyecciones del país de sesión (PRY-012)' })
  async findAll(
    @Query() query: ProyeccionesQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.proyeccionesService.findAll(
      query,
      user.paisSesionId!,
      user.rol,
    );

    return {
      message: 'Proyecciones obtenidas correctamente',
      ...result,
    };
  }

  @Patch('asignar-mercado')
  @Roles(Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA)
  @ApiOperation({ summary: 'Asignación anual de mercado (PRY-011)' })
  async asignarMercado(
    @Body() dto: AsignarMercadoBatchDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const result = await this.proyeccionesService.asignarMercadoBatch(
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol,
    );

    return {
      message: 'Mercado asignado correctamente',
      ...result,
    };
  }

  @Get(':id/dependencias')
  @ApiOperation({ summary: 'Consultar dependencias antes de eliminar (TRX-013)' })
  async getDependencias(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.proyeccionesService.getDependencias(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Dependencias de la proyección obtenidas correctamente',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyección por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const proyeccion = await this.proyeccionesService.findById(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Proyección obtenida correctamente',
      proyeccion,
    };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear proyección manual (PRY-013)' })
  async create(
    @Body() dto: CreateProyeccionDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proyeccion = await this.proyeccionesService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Proyección creada correctamente',
      proyeccion,
    };
  }

  @Patch(':id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar proyección' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProyeccionDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proyeccion = await this.proyeccionesService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Proyección actualizada correctamente',
      proyeccion,
    };
  }

  @Patch(':id/cerrar')
  @Roles(Rol.ADMINISTRADOR, Rol.SUPERVISOR_SISTEMA)
  @ApiOperation({ summary: 'Cerrar proyección manualmente (PRY-004)' })
  async cerrar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proyeccion = await this.proyeccionesService.cerrar(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol,
    );

    return {
      message: 'Proyección cerrada correctamente',
      proyeccion,
    };
  }

  @Patch(':id/vincular-proceso')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Vincular proceso resultante (PRY-003, PRY-015)' })
  async vincularProceso(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VincularProcesoResultanteDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proyeccion = await this.proyeccionesService.vincularProcesoResultante(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Proyección vinculada al proceso resultante correctamente',
      proyeccion,
    };
  }

  @Delete(':id')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar proyección (soft delete)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: EliminarEntidadQueryDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.proyeccionesService.softDelete(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol,
      query.confirmarDependientes === true,
    );

    return {
      message: 'Proyección eliminada correctamente',
    };
  }
}
