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
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  CambiarEstadoProcesoDto,
  CompletarTareaDto,
  CreateProcesoDto,
  ProcesosQueryDto,
  UpdateProcesoDto,
  UpdateProcesoFechasDto,
} from './dto/proceso.dto';
import { ProcesosService } from './procesos.service';

@ApiTags('Procesos — Licitaciones')
@ApiBearerAuth()
@Controller('procesos')
export class ProcesosController {
  constructor(private readonly procesosService: ProcesosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar procesos del país de sesión' })
  async findAll(
    @Query() query: ProcesosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.procesosService.findAll(
      query,
      user.paisSesionId!,
      user.rol as Rol,
    );

    return {
      message: 'Procesos obtenidos correctamente',
      ...result,
    };
  }

  @Get(':id/dependencias')
  @ApiOperation({ summary: 'Consultar dependencias antes de eliminar (TRX-013)' })
  async getDependencias(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.procesosService.getDependencias(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Dependencias del proceso obtenidas correctamente',
      data,
    };
  }

  @Get(':id/fechas/historial')
  @ApiOperation({ summary: 'Historial de cambios de fechas del proceso (FEC-005)' })
  async getFechasHistorial(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.procesosService.getFechasHistorial(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Historial de fechas obtenido correctamente',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proceso por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const proceso = await this.procesosService.findById(id, user.paisSesionId!);

    return {
      message: 'Proceso obtenido correctamente',
      proceso,
    };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar proceso con indicadores (REG-001, PAR-004)' })
  async create(
    @Body() dto: CreateProcesoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proceso = await this.procesosService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Proceso registrado correctamente',
      proceso,
    };
  }

  @Patch(':id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar datos generales del proceso' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcesoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proceso = await this.procesosService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Proceso actualizado correctamente',
      proceso,
    };
  }

  @Patch(':id/fechas')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar fechas del proceso (FEC-004, Admin/Supervisor)' })
  async updateFechas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProcesoFechasDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proceso = await this.procesosService.updateFechas(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Fechas del proceso actualizadas correctamente',
      proceso,
    };
  }

  @Patch(':id/estado')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Cambiar estado del proceso (REV-002)' })
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoProcesoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const proceso = await this.procesosService.cambiarEstado(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Estado del proceso actualizado correctamente',
      proceso,
    };
  }

  @Delete(':id')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar proceso (soft delete, solo Admin)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: EliminarEntidadQueryDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.procesosService.softDelete(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
      query.confirmarDependientes === true,
    );

    return {
      message: 'Proceso eliminado correctamente',
    };
  }

  @Get(':id/tareas')
  @ApiOperation({ summary: 'Listar tareas de seguimiento del proceso (SEG-001)' })
  async findTareas(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.procesosService.findTareas(id, user.paisSesionId!);

    return {
      message: 'Tareas del proceso obtenidas correctamente',
      data,
    };
  }

  @Patch(':id/tareas/:tareaId/completar')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Completar tarea con evidencia (SEG-002)' })
  async completarTarea(
    @Param('id', ParseIntPipe) id: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: CompletarTareaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const tarea = await this.procesosService.completarTarea(
      id,
      tareaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Tarea completada correctamente',
      tarea,
    };
  }
}
