import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditAccion,
  AuditEntidadTipo,
} from '../../common/enums/audit-accion.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { ConfiguracionSistema } from '../../database/entities/configuracion-sistema.entity';
import { AuditService } from '../audit/audit.service';
import { ConfiguracionResponseDto } from './dto/configuracion-response.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

const CONFIG_VALIDATORS: Record<string, (valor: string) => void> = {
  dias_espera_respuesta_crm: (valor) => {
    const parsed = Number.parseInt(valor, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
      throw new BusinessException(
        ErrorCode.CONFIGURACION_VALOR_INVALIDO,
        'dias_espera_respuesta_crm debe ser un entero entre 1 y 365',
        HttpStatus.BAD_REQUEST,
      );
    }
  },
  anio_reporte_vigente: (valor) => {
    const parsed = Number.parseInt(valor, 10);
    const currentYear = new Date().getFullYear();

    if (
      !Number.isInteger(parsed) ||
      parsed < 2000 ||
      parsed > currentYear + 10
    ) {
      throw new BusinessException(
        ErrorCode.CONFIGURACION_VALOR_INVALIDO,
        `anio_reporte_vigente debe ser un año entre 2000 y ${currentYear + 10}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  },
  carga_masiva_habilitada: (valor) => {
    if (valor !== 'true' && valor !== 'false') {
      throw new BusinessException(
        ErrorCode.CONFIGURACION_VALOR_INVALIDO,
        'carga_masiva_habilitada debe ser "true" o "false"',
        HttpStatus.BAD_REQUEST,
      );
    }
  },
};

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(ConfiguracionSistema)
    private readonly configRepository: Repository<ConfiguracionSistema>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<ConfiguracionResponseDto[]> {
    const items = await this.configRepository.find({
      order: { clave: 'ASC' },
    });

    return items.map((item) => this.toResponse(item));
  }

  async findByClave(clave: string): Promise<ConfiguracionResponseDto> {
    const item = await this.configRepository.findOne({ where: { clave } });

    if (!item) {
      throw new BusinessException(
        ErrorCode.CONFIGURACION_NO_ENCONTRADA,
        'Parámetro de configuración no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(item);
  }

  async updateValor(
    clave: string,
    dto: UpdateConfiguracionDto,
    actorId: number,
  ): Promise<ConfiguracionResponseDto> {
    const item = await this.configRepository.findOne({ where: { clave } });

    if (!item) {
      throw new BusinessException(
        ErrorCode.CONFIGURACION_NO_ENCONTRADA,
        'Parámetro de configuración no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    this.validateValor(clave, dto.valor);

    const valorAnterior = item.valor;
    item.valor = dto.valor;
    item.usuarioModificoId = actorId;

    const saved = await this.configRepository.save(item);

    await this.auditService.log({
      usuarioId: actorId,
      accion: AuditAccion.CONFIGURACION_EDITAR,
      entidadTipo: AuditEntidadTipo.CONFIGURACION_SISTEMA,
      campo: clave,
      valorAnterior,
      valorNuevo: dto.valor,
    });

    return this.toResponse(saved);
  }

  private validateValor(clave: string, valor: string): void {
    const validator = CONFIG_VALIDATORS[clave];

    if (validator) {
      validator(valor);
    }
  }

  private toResponse(item: ConfiguracionSistema): ConfiguracionResponseDto {
    return {
      clave: item.clave,
      valor: item.valor,
      descripcion: item.descripcion,
      usuarioModificoId: item.usuarioModificoId,
      fechaModificacion: item.fechaModificacion,
    };
  }
}
