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
import { ClientesQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('CRM — Clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del país de sesión (CLI-001)' })
  async findAll(
    @Query() query: ClientesQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.clientesService.findAll(
      query,
      user.paisSesionId!,
    );

    return {
      message: 'Clientes obtenidos correctamente',
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const cliente = await this.clientesService.findById(id, user.paisSesionId!);

    return {
      message: 'Cliente obtenido correctamente',
      cliente,
    };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear cliente y contacto genérico automático (CLI-001, CON-002)',
  })
  async create(
    @Body() dto: CreateClienteDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const cliente = await this.clientesService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Cliente creado correctamente con contacto genérico',
      cliente,
    };
  }

  @Patch(':id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar cliente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const cliente = await this.clientesService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Cliente actualizado correctamente',
      cliente,
    };
  }

  @Delete(':id')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.clientesService.softDelete(id, actor.userId, actor.paisSesionId!);

    return {
      message: 'Cliente eliminado correctamente',
    };
  }
}
