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
import { CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CatalogosService } from './catalogos.service';
import {
  DepartamentosQueryDto,
  PaisesQueryDto,
  UbicacionesQueryDto,
} from './dto/catalogos-query.dto';
import { CreatePaisDto } from './dto/create-pais.dto';
import {
  CatalogoQueryDto,
  ClonarConfigPaisDto,
  CreateCatalogoPaisDto,
  UpdateCatalogoPaisDto,
} from './dto/catalogo-pais.dto';
import {
  CreatePlantillaTareaDto,
  UpdateConfiguracionPaisDto,
  UpdatePlantillaTareaDto,
} from './dto/pais-config.dto';
import { UpdatePaisDto } from './dto/update-pais.dto';

@ApiTags('Catálogos')
@ApiBearerAuth()
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('paises/referencia')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Catálogo mundial de países (referencia ISO)' })
  async findPaisesReferencia() {
    const data = await this.catalogosService.findPaisesReferencia();

    return {
      message: 'Catálogo de referencia obtenido correctamente',
      data,
    };
  }

  @Get('paises')
  @ApiOperation({ summary: 'Listar países del catálogo (TRX-010)' })
  async findAllPaises(@Query() query: PaisesQueryDto) {
    const data = await this.catalogosService.findAllPaises(query);

    return {
      message: 'Países obtenidos correctamente',
      data,
    };
  }

  @Get('paises/sesion/capabilities')
  @ApiOperation({ summary: 'Capacidades del país de la sesión actual' })
  async getCapabilitiesSesion(@CurrentUser() user: AuthUserPayload) {
    const data = await this.catalogosService.getCapabilities(user.paisSesionId!);

    return {
      message: 'Capacidades obtenidas correctamente',
      data,
    };
  }

  @Get('paises/:id/capabilities')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Capacidades configuradas para un país' })
  async getCapabilities(@Param('id', ParseIntPipe) id: number) {
    const data = await this.catalogosService.getCapabilities(id);

    return {
      message: 'Capacidades obtenidas correctamente',
      data,
    };
  }

  @Get('paises/:id/configuracion')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Configuración editable por país' })
  async findConfiguracionPais(@Param('id', ParseIntPipe) id: number) {
    const data = await this.catalogosService.findConfiguracionPais(id);

    return {
      message: 'Configuración del país obtenida correctamente',
      data,
    };
  }

  @Patch('paises/:id/configuracion/:clave')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar un valor de configuración del país' })
  async updateConfiguracionPais(
    @Param('id', ParseIntPipe) id: number,
    @Param('clave') clave: string,
    @Body() dto: UpdateConfiguracionPaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const item = await this.catalogosService.updateConfiguracionPais(
      id,
      clave,
      dto.valor,
    );

    return {
      message: 'Configuración actualizada correctamente',
      item,
      actorId: actor.userId,
    };
  }

  @Get('paises/:id/plantilla-tareas')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Plantilla de tareas de seguimiento por país' })
  async findPlantillaTareasPais(@Param('id', ParseIntPipe) id: number) {
    const data = await this.catalogosService.findPlantillaTareasPais(id);

    return {
      message: 'Plantilla de tareas obtenida correctamente',
      data,
    };
  }

  @Post('paises/:id/plantilla-tareas')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar una tarea a la plantilla del país' })
  async createPlantillaTareaPais(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePlantillaTareaDto,
  ) {
    const item = await this.catalogosService.createPlantillaTareaPais(id, dto);

    return {
      message: 'Tarea agregada a la plantilla correctamente',
      item,
    };
  }

  @Patch('paises/:id/plantilla-tareas/:tareaId')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar una tarea de la plantilla del país' })
  async updatePlantillaTareaPais(
    @Param('id', ParseIntPipe) id: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: UpdatePlantillaTareaDto,
  ) {
    const item = await this.catalogosService.updatePlantillaTareaPais(
      id,
      tareaId,
      dto,
    );

    return {
      message: 'Tarea de plantilla actualizada correctamente',
      item,
    };
  }

  @Get('catalogo')
  @ApiOperation({ summary: 'Catálogo de negocio del país de sesión' })
  async findCatalogoSesion(
    @Query() query: CatalogoQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const data = await this.catalogosService.findCatalogoSesion(
      user.paisSesionId!,
      query.tipo,
      query.soloActivos ?? true,
    );

    return {
      message: 'Catálogo obtenido correctamente',
      data,
    };
  }

  @Get('paises/:id/catalogo')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Catálogos de negocio de un país (admin)' })
  async findCatalogoPais(
    @Param('id', ParseIntPipe) id: number,
    @Query('tipo') tipo?: CatalogoPaisTipo,
    @Query('soloActivos') soloActivos?: string,
  ) {
    const data = await this.catalogosService.findCatalogoPais(
      id,
      tipo,
      soloActivos === 'true',
    );

    return {
      message: 'Catálogo del país obtenido correctamente',
      data,
    };
  }

  @Post('paises/:id/catalogo')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear ítem de catálogo para un país' })
  async createCatalogoPais(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCatalogoPaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const item = await this.catalogosService.createCatalogoPais(id, dto, actor.userId);

    return {
      message: 'Ítem de catálogo creado correctamente',
      item,
    };
  }

  @Patch('paises/:id/catalogo/:itemId')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @ApiOperation({ summary: 'Actualizar ítem de catálogo del país' })
  async updateCatalogoPais(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCatalogoPaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const item = await this.catalogosService.updateCatalogoPais(
      id,
      itemId,
      dto,
      actor.userId,
    );

    return {
      message: 'Ítem de catálogo actualizado correctamente',
      item,
    };
  }

  @Post('paises/:id/onboarding/resync')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-sincronizar onboarding parcial del país' })
  async resyncOnboardingPais(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.catalogosService.resyncOnboardingPais(id, actor.userId);
  }

  @Post('paises/:id/configuracion/clonar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clonar configuración desde otro país' })
  async clonarConfiguracionPais(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ClonarConfigPaisDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const result = await this.catalogosService.clonarConfiguracionPais(
      id,
      dto.paisOrigenId,
      actor.userId,
    );

    return {
      message: 'Configuración clonada correctamente',
      ...result,
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
    const result = await this.catalogosService.createPais(dto, actor.userId);
    const { onboarding } = result;

    const message =
      onboarding.ubicaciones.total > 0
        ? `País creado correctamente con ${onboarding.ubicaciones.total} ubicaciones geográficas`
        : 'País creado correctamente';

    return {
      message,
      pais: result.pais,
      onboarding,
    };
  }

  @Post('paises/:id/ubicaciones/sincronizar')
  @Roles(Rol.ADMINISTRADOR)
  @RequireWriteAccess()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cargar ubicaciones geográficas de un país (solo si no tiene)',
  })
  async sincronizarUbicacionesPais(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.catalogosService.sincronizarUbicacionesPais(id);
    const { ubicaciones } = result;

    const message = ubicaciones.skipped
      ? 'El país ya tiene ubicaciones geográficas cargadas'
      : ubicaciones.total > 0
        ? `Se cargaron ${ubicaciones.inserted} ubicaciones geográficas`
        : 'No fue posible cargar ubicaciones para este país';

    return {
      message,
      pais: result.pais,
      ubicaciones,
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
