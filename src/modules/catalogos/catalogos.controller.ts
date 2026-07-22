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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireWriteAccess } from '../../common/decorators/require-write-access.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CatalogosService } from './catalogos.service';
import {
  DepartamentosQueryDto,
  PaisesQueryDto,
  UbicacionesQueryDto,
} from './dto/catalogos-query.dto';
import { CreatePaisDto } from './dto/create-pais.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';

@ApiTags('Catálogos')
@ApiBearerAuth()
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('paises')
  @ApiOperation({ summary: 'Listar países del catálogo (TRX-010)' })
  async findAllPaises(@Query() query: PaisesQueryDto) {
    const data = await this.catalogosService.findAllPaises(query);

    return {
      message: 'Países obtenidos correctamente',
      data,
    };
  }

  @Get('paises/:id')
  @ApiOperation({ summary: 'Obtener un país por ID' })
  async findPaisById(@Param('id', ParseIntPipe) id: number) {
    const pais = await this.catalogosService.findPaisById(id);

    return {
      message: 'País obtenido correctamente',
      pais,
    };
  }

  @Post('paises')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear país (solo Administrador)' })
  async createPais(
    @Body() dto: CreatePaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const pais = await this.catalogosService.createPais(dto, actor.userId);

    return {
      message: 'País creado correctamente',
      pais,
    };
  }

  @Patch('paises/:id')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar país (solo Administrador)' })
  async updatePais(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const pais = await this.catalogosService.updatePais(id, dto, actor.userId);

    return {
      message: 'País actualizado correctamente',
      pais,
    };
  }

  @Get('ubicaciones')
  @ApiOperation({
    summary:
      'Listar ubicaciones geográficas precargadas en BD (REG-008, solo lectura)',
  })
  async findUbicaciones(
    @Query() query: UbicacionesQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const result = await this.catalogosService.findUbicaciones(
      query,
      user.paisSesionId!,
      user.rol,
    );

    return {
      message: 'Ubicaciones obtenidas correctamente',
      ...result,
    };
  }

  @Get('ubicaciones/departamentos')
  @ApiOperation({ summary: 'Listar departamentos/provincias distintos por país' })
  async findDepartamentos(
    @Query() query: DepartamentosQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.catalogosService.findDepartamentos(
      query,
      user.paisSesionId!,
      user.rol,
    );

    return {
      message: 'Departamentos obtenidos correctamente',
      data,
    };
  }

  @Get('ubicaciones/:id')
  @ApiOperation({ summary: 'Obtener una ubicación geográfica por ID' })
  async findUbicacionById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const ubicacion = await this.catalogosService.findUbicacionById(
      id,
      user.paisSesionId!,
      user.rol,
    );

    return {
      message: 'Ubicación obtenida correctamente',
      ubicacion,
    };
  }
}
