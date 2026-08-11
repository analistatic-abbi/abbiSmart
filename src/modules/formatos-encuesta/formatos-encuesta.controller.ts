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
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import {
  ClonarFormatoEncuestaDto,
  CreateFormatoEncuestaDto,
  FormatosEncuestaQueryDto,
  ImportFormatoEncuestaDto,
  UpdateFormatoEncuestaDto,
  UpdateFormatoEncuestaEstructuraDto,
  UpdateFormatoEncuestaPreguntasDto,
} from './dto/formato-encuesta.dto';
import { FormatosEncuestaService } from './formatos-encuesta.service';

@ApiTags('KAM — Formatos de encuesta')
@ApiBearerAuth()
@Controller('formatos-encuesta')
export class FormatosEncuestaController {
  constructor(private readonly formatosEncuestaService: FormatosEncuestaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar formatos de encuesta del país de sesión' })
  async findAll(
    @Query() query: FormatosEncuestaQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.findAll(
      user.paisSesionId!,
      query.soloActivos ?? false,
    );

    return { message: 'Formatos de encuesta obtenidos correctamente', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de formato de encuesta con preguntas' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.findById(id, user.paisSesionId!);
    return { message: 'Formato de encuesta obtenido correctamente', data };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear formato de encuesta manualmente' })
  async create(
    @Body() dto: CreateFormatoEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Formato de encuesta creado correctamente', data };
  }

  @Post('import')
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
      required: ['nombre', 'file'],
      properties: {
        nombre: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Importar formato desde Excel/CSV (columna A = pregunta)' })
  async importFormato(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ImportFormatoEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BusinessException(
        ErrorCode.FORMATO_ENCUESTA_PREGUNTAS_INVALIDAS,
        'Debe adjuntar un archivo Excel o CSV',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.formatosEncuestaService.importFromSpreadsheet(
      body.nombre.trim(),
      file.originalname,
      file.buffer,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Formato de encuesta importado correctamente', data };
  }

  @Post(':id/clonar')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Clonar formato de encuesta' })
  async clonar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClonarFormatoEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.clonar(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Formato de encuesta clonado correctamente', data };
  }

  @Patch(':id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar nombre o estado activo del formato' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormatoEncuestaDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Formato de encuesta actualizado correctamente', data };
  }

  @Patch(':id/estructura')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Reemplazar secciones/preguntas/ítems (solo si no está en uso)' })
  async updateEstructura(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormatoEncuestaEstructuraDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.updateEstructura(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Estructura del formato actualizada correctamente', data };
  }

  @Patch(':id/preguntas')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Reemplazar preguntas (legacy plano; solo si no está en uso)' })
  async updatePreguntas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormatoEncuestaPreguntasDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const data = await this.formatosEncuestaService.updatePreguntas(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return { message: 'Preguntas del formato actualizadas correctamente', data };
  }
}
