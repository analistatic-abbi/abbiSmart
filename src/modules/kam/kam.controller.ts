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
  Put,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  BitacoraRondaDto,
  CreateBitacoraEntradaDto,
  CrearEncuestaDto,
  GuardarRespuestasEncuestaDto,
  KamCalendarioQueryDto,
  KamQueryDto,
  ReunionRondaDto,
  UpdateVeredictoDto,
} from './dto/kam.dto';
import { KamService } from './kam.service';

@ApiTags('KAM')
@ApiBearerAuth()
@Controller('kam')
export class KamController {
  constructor(private readonly kamService: KamService) {}

  @Get()
  @ApiOperation({ summary: 'Listar KAMs del país de sesión' })
  async findAll(@Query() query: KamQueryDto, @CurrentUser() user: AuthUserPayload) {
    const result = await this.kamService.findAll(query, user.paisSesionId!);
    return { message: 'KAMs obtenidos correctamente', ...result };
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar listado de KAM a Excel (.xlsx)' })
  async exportar(
    @Query() query: KamQueryDto,
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ) {
    const { buffer, filename, truncado } = await this.kamService.exportarXlsx(
      query,
      user.paisSesionId!,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (truncado) {
      res.setHeader('X-Export-Truncated', 'true');
    }

    return res.send(buffer);
  }

  @Get('calendario')
  @ApiOperation({ summary: 'Eventos de calendario KAM del año' })
  async getCalendario(
    @Query() query: KamCalendarioQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.kamService.getCalendario(
      user.paisSesionId!,
      query.anio ?? new Date().getFullYear(),
    );

    return { message: 'Calendario KAM obtenido correctamente', data };
  }

  @Get('por-proceso/:procesoId')
  @ApiOperation({ summary: 'Obtener KAM asociado a un proceso' })
  async findByProceso(
    @Param('procesoId', ParseIntPipe) procesoId: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.kamService.findByProcesoId(procesoId, user.paisSesionId!);

    return {
      message: data ? 'KAM del proceso obtenido correctamente' : 'El proceso no tiene KAM',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de KAM con rondas' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.kamService.findById(id, user.paisSesionId!);
    return { message: 'KAM obtenido correctamente', data };
  }

  @Post(':id/rondas')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva ronda KAM' })
  async crearRonda(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.crearRonda(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Ronda KAM creada correctamente', data };
  }

  @Post(':id/rondas/:rondaId/bitacora')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Agregar entrada a la bitácora de la ronda' })
  async agregarBitacora(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Body() dto: CreateBitacoraEntradaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.agregarBitacora(
      id,
      rondaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Comentario agregado a la bitácora', data };
  }

  @Patch(':id/rondas/:rondaId/bitacora')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Agregar entrada a la bitácora (compat)', deprecated: true })
  async updateBitacora(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Body() dto: BitacoraRondaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.agregarBitacora(
      id,
      rondaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Comentario agregado a la bitácora', data };
  }

  @Post(':id/rondas/:rondaId/correspondencia')
  @RequireWriteAccess()
  @UseInterceptors(
    FilesInterceptor('archivos', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir uno o varios archivos de correspondencia' })
  async subirCorrespondencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @UploadedFiles() archivos: Express.Multer.File[] | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const lista = (archivos ?? []).filter((f) => f?.buffer?.length);
    if (!lista.length) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'Debe adjuntar al menos un archivo',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.kamService.subirCorrespondencia(
      id,
      rondaId,
      lista,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Correspondencia subida correctamente', data };
  }

  @Get(':id/rondas/:rondaId/correspondencia/:archivoId')
  @ApiOperation({ summary: 'Descargar un archivo de correspondencia' })
  async descargarCorrespondenciaPorId(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ) {
    const archivo = await this.kamService.getCorrespondenciaPath(
      id,
      rondaId,
      user.paisSesionId!,
      archivoId,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(archivo.nombre)}"`,
    );

    return res.sendFile(archivo.rutaAbsoluta, (err) => {
      if (err && !res.headersSent) {
        throw new BusinessException(
          ErrorCode.KAM_RONDA_NO_ENCONTRADA,
          'No fue posible descargar la correspondencia',
          HttpStatus.NOT_FOUND,
        );
      }
    });
  }

  @Get(':id/rondas/:rondaId/correspondencia')
  @ApiOperation({ summary: 'Descargar el primer archivo de correspondencia (compat)' })
  async descargarCorrespondencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @CurrentUser() user: AuthUserPayload,
    @Res() res: Response,
  ) {
    const archivo = await this.kamService.getCorrespondenciaPath(
      id,
      rondaId,
      user.paisSesionId!,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(archivo.nombre)}"`,
    );

    return res.sendFile(archivo.rutaAbsoluta, (err) => {
      if (err && !res.headersSent) {
        throw new BusinessException(
          ErrorCode.KAM_RONDA_NO_ENCONTRADA,
          'No fue posible descargar la correspondencia',
          HttpStatus.NOT_FOUND,
        );
      }
    });
  }

  @Delete(':id/rondas/:rondaId/correspondencia/:archivoId')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Eliminar un archivo de correspondencia' })
  async eliminarCorrespondenciaPorId(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('archivoId', ParseIntPipe) archivoId: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.eliminarCorrespondencia(
      id,
      rondaId,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
      archivoId,
    );

    return { message: 'Archivo de correspondencia eliminado', data };
  }

  @Delete(':id/rondas/:rondaId/correspondencia')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Eliminar toda la correspondencia de la ronda' })
  async eliminarCorrespondencia(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.eliminarCorrespondencia(
      id,
      rondaId,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Correspondencia eliminada correctamente', data };
  }

  @Post(':id/rondas/:rondaId/encuestas')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear encuesta en ronda' })
  async crearEncuesta(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Body() dto: CrearEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.crearEncuesta(
      id,
      rondaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Encuesta creada correctamente', data };
  }

  @Put(':id/rondas/:rondaId/encuestas/:encuestaId/respuestas')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Guardar respuestas de un contacto en encuesta' })
  async guardarRespuestas(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('encuestaId', ParseIntPipe) encuestaId: number,
    @Body() dto: GuardarRespuestasEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.guardarRespuestas(
      id,
      rondaId,
      encuestaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Respuestas guardadas correctamente', data };
  }

  @Patch(':id/rondas/:rondaId/encuestas/:encuestaId/veredicto')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar veredicto de una encuesta' })
  async updateVeredictoEncuesta(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Param('encuestaId', ParseIntPipe) encuestaId: number,
    @Body() dto: UpdateVeredictoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.updateVeredictoEncuesta(
      id,
      rondaId,
      encuestaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );
    return { message: 'Veredicto de encuesta actualizado', data };
  }

  @Patch(':id/rondas/:rondaId/veredicto')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar veredicto agregado de la ronda' })
  async updateVeredictoRonda(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Body() dto: UpdateVeredictoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.updateVeredictoRonda(
      id,
      rondaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );
    return { message: 'Veredicto de ronda actualizado', data };
  }

  @Post(':id/rondas/:rondaId/ejecutar')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Marcar ronda como ejecutada manualmente' })
  async ejecutarRonda(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.ejecutarRonda(
      id,
      rondaId,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Ronda marcada como ejecutada', data };
  }

  @Patch(':id/rondas/:rondaId/reunion')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Agendar reunión de fin de ronda' })
  async agendarReunion(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @Body() dto: ReunionRondaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.agendarReunion(
      id,
      rondaId,
      dto,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Reunión agendada correctamente', data };
  }

  @Patch(':id/rondas/:rondaId/socializar')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Marcar ronda como socializada' })
  async socializarRonda(
    @Param('id', ParseIntPipe) id: number,
    @Param('rondaId', ParseIntPipe) rondaId: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.kamService.socializarRonda(
      id,
      rondaId,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return { message: 'Ronda socializada correctamente', data };
  }
}
