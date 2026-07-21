import {

  Body,

  Controller,

  HttpCode,

  HttpStatus,

  Param,

  ParseIntPipe,

  Patch,

  Post,

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

import { UsersService } from './users.service';



@ApiTags('Usuarios')

@Controller('users')

export class UsersController {

  constructor(private readonly usersService: UsersService) {}



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



  @Post(':id/unlock')

  @HttpCode(HttpStatus.OK)

  @ApiBearerAuth()

  @Roles(Rol.ADMINISTRADOR)

  @ApiOperation({ summary: 'Desbloquear cuenta de usuario' })

  async unlock(

    @Param('id', ParseIntPipe) id: number,

    @CurrentUser() actor: AuthUserPayload,

  ) {

    const usuario = await this.usersService.unlockUser(id, actor.userId);



    return {

      message: 'Cuenta desbloqueada correctamente',

      usuario,

    };

  }

}


