import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminOrJwtAdministradorGuard } from '../../common/guards/admin-or-jwt-administrador.guard';
import { Pais } from '../../database/entities/pais.entity';
import { SesionUsuario } from '../../database/entities/sesion-usuario.entity';
import { TokenActivacion } from '../../database/entities/token-activacion.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pais,
      Usuario,
      SesionUsuario,
      TokenActivacion,
    ]),
    AuthModule,
    MailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AdminOrJwtAdministradorGuard],
  exports: [UsersService],
})
export class UsersModule {}
