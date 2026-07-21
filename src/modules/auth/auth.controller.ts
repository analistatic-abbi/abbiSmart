import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  PreAuthToken,
  PreAuthUserId,
} from '../../common/decorators/pre-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PreAuthGuard } from '../../common/guards/pre-auth.guard';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { ActivationService } from './activation.service';
import { AuthTokenService } from './auth-token.service';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SelectCountryDto } from './dto/select-country.dto';
import type { AuthUserPayload } from './interfaces/auth-user-payload.interface';
import { LoginService } from './login.service';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(
    private readonly activationService: ActivationService,
    private readonly loginService: LoginService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar cuenta con token del correo' })
  async activate(@Body() dto: ActivateAccountDto) {
    const usuario = await this.activationService.activateAccount(
      dto.token,
      dto.password,
    );

    return {
      message: 'Cuenta activada correctamente',
      usuario,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginService.login(dto.correo, dto.password);

    if (result.requiresCountrySelection) {
      return {
        message: 'Credenciales válidas. Seleccione país de trabajo.',
        requiresCountrySelection: true,
        preAuthToken: result.preAuthToken,
        usuario: result.usuario,
        paises: result.paises,
      };
    }

    const tokens = await this.authTokenService.issueTokensForSession(
      result.usuario,
      result.session,
      res,
    );

    return {
      message: 'Inicio de sesión exitoso',
      requiresCountrySelection: false,
      ...tokens,
    };
  }

  @Public()
  @Post('select-country')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PreAuthGuard)
  @ApiOperation({ summary: 'Seleccionar país de sesión tras login' })
  async selectCountry(
    @PreAuthUserId() usuarioId: number,
    @PreAuthToken() preAuthToken: string,
    @Body() dto: SelectCountryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.loginService.selectCountry(
      usuarioId,
      dto.paisId,
      preAuthToken,
    );

    const tokens = await this.authTokenService.issueTokensForSession(
      result.usuario,
      result.session,
      res,
    );

    return {
      message: 'País de sesión configurado correctamente',
      ...tokens,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token del correo' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.activationService.resetPasswordWithToken(
      dto.token,
      dto.password,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con cookie de refresh' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = this.authTokenService.getRefreshTokenFromRequest(req);

    if (!rawRefreshToken) {
      throw new BusinessException(
        ErrorCode.AUTH_SESION_INVALIDA,
        'No se encontró la cookie de sesión',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.authTokenService.refreshTokens(
      rawRefreshToken,
      res,
    );

    return {
      message: 'Token renovado correctamente',
      ...tokens,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cerrar sesión actual' })
  async logout(
    @CurrentUser() user: AuthUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authTokenService.logout(user.sessionId, user.userId, res);

    return {
      message: 'Sesión cerrada correctamente',
    };
  }
}
