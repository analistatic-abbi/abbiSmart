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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { AdminOrJwtAdministradorGuard } from '../../common/guards/admin-or-jwt-administrador.guard';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar usuarios (PERF-004)' })
  async findAll(@Query() query: UsersQueryDto) {
    const result = await this.usersService.findAll(query);

    return {
      message: 'Usuarios obtenidos correctamente',
      ...result,
    };
  }

  @Post()
  @Public()
  @UseGuards(AdminOrJwtAdministradorGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear usuario (Administrador JWT o X-Admin-Dev-Key)',
  })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor?: AuthUserPayload,
  ) {
    const result = await this.usersService.createUser(dto, actor?.userId);

    return {
      message: 'Usuario creado. Se envió el correo de activación.',
      usuario: result.usuario,
      ...(result.devActivationToken
        ? { devActivationToken: result.devActivationToken }
        : {}),
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar usuario (solo Administrador)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const usuario = await this.usersService.updateUser(id, dto, actor.userId);

    return {
      message: 'Usuario actualizado correctamente',
      usuario,
    };
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.usersService.requestPasswordReset(id, actor.userId);
  }

  @Post(':id/reenviar-activacion')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reenviar enlace de activación (PERF-009)' })
  async reenviarActivacion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.usersService.reenviarActivacion(id, actor.userId);
  }

  @Patch(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar usuario (PERF-002)' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const usuario = await this.usersService.deactivateUser(id, actor.userId);

    return {
      message: 'Usuario desactivado correctamente',
      usuario,
    };
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desbloquear cuenta vía nuevo enlace de activación (PERF-011)' })
  async unlock(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    return this.usersService.unlockUser(id, actor.userId);
  }
}
