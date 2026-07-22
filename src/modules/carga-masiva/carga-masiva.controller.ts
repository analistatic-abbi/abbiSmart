import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CargaMasivaService } from './carga-masiva.service';

@ApiTags('CRM — Carga masiva')
@ApiBearerAuth()
@Controller('carga-masiva')
export class CargaMasivaController {
  constructor(private readonly cargaMasivaService: CargaMasivaService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Consultar historial de cargas masivas (TRX-007)' })
  async findLogs(@CurrentUser() user: AuthUserPayload) {
    const data = await this.cargaMasivaService.findLogs(user.userId);

    return {
      message: 'Historial de cargas masivas obtenido correctamente',
      data,
    };
  }

  @Post('clientes')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
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
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Importar clientes desde CSV o Excel (.xlsx). Columnas: empresa, pais, region/departamento, segmento (CLI-004)',
  })
  async importClientes(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const { buffer, fileName } = this.readUpload(file, contentField, 'clientes.csv');
    const result = await this.cargaMasivaService.importClientes(
      fileName,
      buffer,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Carga masiva de clientes procesada',
      ...result,
    };
  }

  @Post('contactos')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
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
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Importar contactos desde CSV o Excel (.xlsx). Columnas: empresa/cliente_id, nombre, region, referido_por_nombre (CON-003)',
  })
  async importContactos(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const { buffer, fileName } = this.readUpload(file, contentField, 'contactos.csv');
    const result = await this.cargaMasivaService.importContactos(
      fileName,
      buffer,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Carga masiva de contactos procesada',
      ...result,
    };
  }

  @Post('proyecciones')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
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
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Importar proyecciones desde CSV o Excel (.xlsx). Columnas: anio_proyectado, fecha_estimada_publicacion, valor_venta, valor_facturacion, proceso_codigo (opcional) (PRY-014)',
  })
  async importProyecciones(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const { buffer, fileName } = this.readUpload(
      file,
      contentField,
      'proyecciones.csv',
    );
    const result = await this.cargaMasivaService.importProyecciones(
      fileName,
      buffer,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Carga masiva de proyecciones procesada',
      ...result,
    };
  }

  private readUpload(
    file: Express.Multer.File | undefined,
    contentField: string | undefined,
    defaultFileName: string,
  ): { buffer: Buffer; fileName: string } {
    if (file?.buffer?.length) {
      return {
        buffer: file.buffer,
        fileName: file.originalname ?? defaultFileName,
      };
    }

    const inlineContent = contentField?.trim();

    if (inlineContent) {
      return {
        buffer: Buffer.from(inlineContent, 'utf8'),
        fileName: defaultFileName,
      };
    }

    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      file
        ? 'El archivo está vacío. En Postman, vuelva a seleccionar el archivo o use el campo content con el texto del CSV.'
        : 'Debe adjuntar un archivo CSV/Excel en el campo file o enviar el contenido en el campo content',
      HttpStatus.BAD_REQUEST,
    );
  }
}
