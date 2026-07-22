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
      'Importar clientes desde CSV (empresa,ubicacion_id,segmento,segmento_otro)',
  })
  async importClientes(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const content = this.readFileContent(file, contentField);
    const fileName = file?.originalname ?? 'clientes.csv';
    const result = await this.cargaMasivaService.importClientes(
      fileName,
      content,
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
      'Importar contactos desde CSV (cliente_id,nombre,ubicacion_id,cargo,telefono,correo,referido_por_contacto_id)',
  })
  async importContactos(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const content = this.readFileContent(file, contentField);
    const fileName = file?.originalname ?? 'contactos.csv';
    const result = await this.cargaMasivaService.importContactos(
      fileName,
      content,
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
      'Importar proyecciones desde CSV (anio_proyectado,fecha_estimada_publicacion,valor_venta,valor_facturacion,mercado,proceso_origen_id)',
  })
  async importProyecciones(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') contentField: string | undefined,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const content = this.readFileContent(file, contentField);
    const fileName = file?.originalname ?? 'proyecciones.csv';
    const result = await this.cargaMasivaService.importProyecciones(
      fileName,
      content,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Carga masiva de proyecciones procesada',
      ...result,
    };
  }

  private readFileContent(
    file: Express.Multer.File | undefined,
    contentField?: string,
  ): string {
    if (file?.buffer?.length) {
      return file.buffer.toString('utf8');
    }

    const inlineContent = contentField?.trim();

    if (inlineContent) {
      return inlineContent;
    }

    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      file
        ? 'El archivo CSV está vacío. En Postman, vuelva a seleccionar el archivo o use el campo content con el texto del CSV.'
        : 'Debe adjuntar un archivo CSV en el campo file o enviar el contenido en el campo content',
      HttpStatus.BAD_REQUEST,
    );
  }
}
