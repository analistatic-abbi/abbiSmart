import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FijacionEntidadTipo } from '../../common/enums/fijacion-entidad-tipo.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/interfaces/auth-user-payload.interface';
import { BandejaPersonalService } from './bandeja-personal.service';
import { FijarEntidadDto } from './dto/bandeja-personal.dto';

@ApiTags('Bandeja personal')
@ApiBearerAuth()
@Controller('bandeja-personal')
export class BandejaPersonalController {
  constructor(private readonly bandejaPersonalService: BandejaPersonalService) {}

  @Get()
  @ApiOperation({ summary: 'Lista agrupada de entidades fijadas por el usuario' })
  async getBandeja(@CurrentUser() user: AuthUserPayload) {
    const data = await this.bandejaPersonalService.getBandeja(
      user.userId,
      user.paisSesionId!,
    );

    return {
      message: 'Bandeja personal obtenida correctamente',
      data,
    };
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fijar una entidad en la bandeja personal' })
  async fijar(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: FijarEntidadDto,
  ) {
    await this.bandejaPersonalService.fijar(
      user.userId,
      user.paisSesionId!,
      dto,
    );

    return {
      message: 'Entidad fijada correctamente',
    };
  }

  @Delete(':entidadTipo/:entidadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desfijar una entidad de la bandeja personal' })
  async desfijar(
    @CurrentUser() user: AuthUserPayload,
    @Param('entidadTipo', new ParseEnumPipe(FijacionEntidadTipo))
    entidadTipo: FijacionEntidadTipo,
    @Param('entidadId', ParseIntPipe) entidadId: number,
  ) {
    await this.bandejaPersonalService.desfijar(
      user.userId,
      entidadTipo,
      entidadId,
    );

    return {
      message: 'Entidad desfijada correctamente',
    };
  }

  @Get('estado/:entidadTipo/:entidadId')
  @ApiOperation({ summary: 'Consultar si una entidad está fijada' })
  async getEstado(
    @CurrentUser() user: AuthUserPayload,
    @Param('entidadTipo', new ParseEnumPipe(FijacionEntidadTipo))
    entidadTipo: FijacionEntidadTipo,
    @Param('entidadId', ParseIntPipe) entidadId: number,
  ) {
    const data = await this.bandejaPersonalService.getEstado(
      user.userId,
      entidadTipo,
      entidadId,
    );

    return {
      message: 'Estado de fijación obtenido correctamente',
      data,
    };
  }
}
