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
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { ContactosService } from './contactos.service';
import { ContactosQueryDto } from './dto/contactos-query.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@ApiTags('CRM — Contactos')
@ApiBearerAuth()
@Controller()
export class ContactosController {
  constructor(private readonly contactosService: ContactosService) {}

  @Get('contactos')
  @ApiOperation({ summary: 'Listar contactos con filtros (TRX-006)' })
  async findAll(
    @Query() query: ContactosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.contactosService.findAll(
      query,
      user.paisSesionId!,
    );

    return {
      message: 'Contactos obtenidos correctamente',
      ...result,
    };
  }

  @Get('clientes/:clienteId/contactos')
  @ApiOperation({ summary: 'Listar contactos de un cliente (CON-001)' })
  async findByCliente(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.contactosService.findByCliente(
      clienteId,
      user.paisSesionId!,
    );

    return {
      message: 'Contactos obtenidos correctamente',
      data,
    };
  }

  @Get('contactos/:id')
  @ApiOperation({ summary: 'Obtener contacto por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const contacto = await this.contactosService.findById(id, user.paisSesionId!);

    return {
      message: 'Contacto obtenido correctamente',
      contacto,
    };
  }

  @Post('clientes/:clienteId/contactos')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear contacto para un cliente (CON-001)' })
  async create(
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() dto: CreateContactoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const contacto = await this.contactosService.create(
      clienteId,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Contacto creado correctamente',
      contacto,
    };
  }

  @Patch('contactos/:id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar contacto (CON-003)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const contacto = await this.contactosService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Contacto actualizado correctamente',
      contacto,
    };
  }

  @Delete('contactos/:id')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar contacto (no aplica al genérico)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.contactosService.softDelete(
      id,
      actor.userId,
      actor.paisSesionId!,
      actor.rol as Rol,
    );

    return {
      message: 'Contacto eliminado correctamente',
    };
  }
}
