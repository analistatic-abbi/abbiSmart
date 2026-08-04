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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  EvaluarCalificacionesDto,
  FormatosCalificacionQueryDto,
  ImportFormatoCalificacionDto,
} from './dto/formato-calificacion.dto';
import { FormatosCalificacionService } from './formatos-calificacion.service';

@ApiTags('Procesos — Formatos de calificación')
@ApiBearerAuth()
@Controller('formatos-calificacion')
export class FormatosCalificacionController {
  constructor(
    private readonly formatosCalificacionService: FormatosCalificacionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar formatos de calificación del país de sesión' })
  async findAll(
    @Query() query: FormatosCalificacionQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.findAll(
      user.paisSesionId!,
      query.soloActivos ?? false,
    );

    return {
      message: 'Formatos de calificación obtenidos correctamente',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un formato con sus rangos' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.findById(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Formato de calificación obtenido correctamente',
      data,
    };
  }

  @Post('import')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre', 'puntajeMinimo', 'file'],
      properties: {
        nombre: { type: 'string' },
        puntajeMinimo: { type: 'integer' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Importar formato desde Excel/CSV (solo Administrador)' })
  async importFormato(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ImportFormatoCalificacionDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BusinessException(
        ErrorCode.FORMATO_RANGOS_INVALIDOS,
        'Debe adjuntar un archivo Excel o CSV',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.formatosCalificacionService.importFromSpreadsheet(
      body.nombre.trim(),
      body.puntajeMinimo,
      file.originalname,
      file.buffer,
      user.userId,
      user.paisSesionId!,
    );

    return {
      message: 'Formato de calificación importado correctamente',
      data,
    };
  }

  @Patch(':id/desactivar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Desactivar un formato de calificación' })
  async desactivar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.setActivo(
      id,
      user.paisSesionId!,
      false,
    );

    return {
      message: 'Formato de calificación desactivado',
      data,
    };
  }

  @Patch(':id/activar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Activar un formato de calificación' })
  async activar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.setActivo(
      id,
      user.paisSesionId!,
      true,
    );

    return {
      message: 'Formato de calificación activado',
      data,
    };
  }
}

@ApiTags('Procesos — Calificación por puntos')
@ApiBearerAuth()
@Controller('procesos')
export class ProcesoCalificacionesController {
  constructor(
    private readonly formatosCalificacionService: FormatosCalificacionService,
  ) {}

  @Get(':id/calificaciones')
  @ApiOperation({ summary: 'Resultados de calificación por puntos de un proceso' })
  async findCalificaciones(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.findCalificacionesByProceso(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Calificaciones del proceso obtenidas correctamente',
      data,
    };
  }

  @Post(':id/calificaciones/evaluar')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluar proceso contra uno o más formatos de calificación' })
  async evaluar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EvaluarCalificacionesDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosCalificacionService.evaluarProceso(
      id,
      dto,
      user.userId,
      user.paisSesionId!,
    );

    return {
      message: 'Evaluación por puntos completada',
      data,
    };
  }
}
