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
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CreateRelacionamientoDto } from './dto/create-relacionamiento.dto';
import { RelacionamientosQueryDto } from './dto/relacionamiento-response.dto';
import { UpdateRelacionamientoDto } from './dto/update-relacionamiento.dto';
import { RelacionamientosService } from './relacionamientos.service';

@ApiTags('CRM — Relacionamientos')
@ApiBearerAuth()
@Controller('relacionamientos')
export class RelacionamientosController {
  constructor(
    private readonly relacionamientosService: RelacionamientosService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar relacionamientos (REL-001)' })
  async findAll(
    @Query() query: RelacionamientosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.relacionamientosService.findAll(
      query,
      user.paisSesionId!,
    );

    return {
      message: 'Relacionamientos obtenidos correctamente',
      ...result,
    };
  }

  @Get('vencidos')
  @ApiOperation({
    summary: 'Listar relacionamientos vencidos sin respuesta (REL-008)',
  })
  async findVencidos(@CurrentUser() user: AuthUserPayload) {
    const data = await this.relacionamientosService.findVencidos(
      user.paisSesionId!,
    );

    return {
      message: 'Relacionamientos vencidos obtenidos correctamente',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener relacionamiento por ID' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const relacionamiento = await this.relacionamientosService.findById(
      id,
      user.paisSesionId!,
    );

    return {
      message: 'Relacionamiento obtenido correctamente',
      relacionamiento,
    };
  }

  @Post()
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar relacionamiento (REL-001)' })
  async create(
    @Body() dto: CreateRelacionamientoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const relacionamiento = await this.relacionamientosService.create(
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Relacionamiento registrado correctamente',
      relacionamiento,
    };
  }

  @Patch(':id')
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar relacionamiento o registrar respuesta' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRelacionamientoDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const relacionamiento = await this.relacionamientosService.update(
      id,
      dto,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Relacionamiento actualizado correctamente',
      relacionamiento,
    };
  }

  @Delete(':id')
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar relacionamiento (soft delete)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    await this.relacionamientosService.softDelete(
      id,
      actor.userId,
      actor.paisSesionId!,
    );

    return {
      message: 'Relacionamiento eliminado correctamente',
    };
  }
}
