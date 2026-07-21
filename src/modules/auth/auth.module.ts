import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreAuthGuard } from '../../common/guards/pre-auth.guard';
import { Pais } from '../../database/entities/pais.entity';
import { SesionUsuario } from '../../database/entities/sesion-usuario.entity';
import { TokenActivacion } from '../../database/entities/token-activacion.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ActivationService } from './activation.service';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { LoginService } from './login.service';
import { PreAuthService } from './pre-auth.service';
import { SesionService } from './sesion.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.accessSecret');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET no está configurado');
        }

        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('jwt.accessExpiresIn') ??
              '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([
      TokenActivacion,
      Usuario,
      SesionUsuario,
      Pais,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    ActivationService,
    LoginService,
    PreAuthService,
    SesionService,
    AuthTokenService,
    JwtStrategy,
    PreAuthGuard,
  ],
  exports: [
    ActivationService,
    LoginService,
    SesionService,
    AuthTokenService,
    JwtModule,
  ],
})
export class AuthModule {}
