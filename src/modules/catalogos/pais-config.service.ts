import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PAIS_CONFIG_CALIFICACION_PUNTOS,
  PAIS_CONFIG_DEFAULTS,
  PAIS_CONFIG_MARGEN_CASI_PCT,
} from '../../common/constants/pais-config.constants';
import { PLANTILLA_TAREAS_DEFAULT } from '../../common/constants/plantilla-tareas-default.constants';
import { generarCodigoTarea } from '../../common/utils/codigo-tarea.util';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { ConfiguracionPais } from '../../database/entities/configuracion-pais.entity';
import { PlantillaTareaPais } from '../../database/entities/plantilla-tarea-pais.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { CatalogoPaisService } from './catalogo-pais.service';

export interface PaisCapabilities {
  calificacionPorPuntos: boolean;
  margenCasiPct: number;
  etiquetasGeo: {
    nivel1: string;
    nivel2: string;
  };
}

export interface ConfiguracionPaisItem {
  clave: string;
  valor: string;
  descripcion: string | null;
}

export interface PlantillaTareaItem {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  aplicaRfi: boolean;
  requiereFechaAdquisicion: boolean;
}

@Injectable()
export class PaisConfigService {
  constructor(
    @InjectRepository(ConfiguracionPais)
    private readonly configPaisRepository: Repository<ConfiguracionPais>,
    @InjectRepository(PlantillaTareaPais)
    private readonly plantillaRepository: Repository<PlantillaTareaPais>,
    private readonly configuracionService: ConfiguracionService,
    private readonly catalogoPaisService: CatalogoPaisService,
  ) {}

  async getValor(paisId: number, clave: string): Promise<string | null> {
    const item = await this.configPaisRepository.findOne({
      where: { paisId, clave },
    });

    if (item) {
      return item.valor;
    }

    try {
      const global = await this.configuracionService.findByClave(clave);
      return global.valor;
    } catch {
      return null;
    }
  }

  async getBoolean(
    paisId: number,
    clave: string,
    defaultValue = false,
  ): Promise<boolean> {
    const valor = await this.getValor(paisId, clave);

    if (valor === null) {
      return defaultValue;
    }

    return valor === 'true' || valor === '1';
  }

  async habilitaCalificacionPorPuntos(paisId: number): Promise<boolean> {
    return this.getBoolean(paisId, PAIS_CONFIG_CALIFICACION_PUNTOS, false);
  }

  async assertCalificacionPorPuntos(paisId: number): Promise<void> {
    const habilitada = await this.habilitaCalificacionPorPuntos(paisId);

    if (!habilitada) {
      throw new BusinessException(
        ErrorCode.PERMISO_DENEGADO,
        'La calificación por puntos no está habilitada para este país',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async getMargenCasiPct(paisId: number): Promise<number> {
    const valor = await this.getValor(paisId, PAIS_CONFIG_MARGEN_CASI_PCT);

    if (valor === null || valor.trim() === '') {
      return 5;
    }

    const parsed = Number(valor);

    return Number.isFinite(parsed) ? parsed : 5;
  }

  async getCapabilities(paisId: number): Promise<PaisCapabilities> {
    const etiquetasGeo = await this.catalogoPaisService.getEtiquetasGeo(paisId);

    return {
      calificacionPorPuntos: await this.habilitaCalificacionPorPuntos(paisId),
      margenCasiPct: await this.getMargenCasiPct(paisId),
      etiquetasGeo,
    };
  }

  async findConfiguracion(paisId: number): Promise<ConfiguracionPaisItem[]> {
    const items = await this.configPaisRepository.find({
      where: { paisId },
      order: { clave: 'ASC' },
    });

    return items.map((item) => ({
      clave: item.clave,
      valor: item.valor,
      descripcion: item.descripcion,
    }));
  }

  async upsertConfiguracion(
    paisId: number,
    clave: string,
    valor: string,
    descripcion?: string | null,
  ): Promise<ConfiguracionPaisItem> {
    let item = await this.configPaisRepository.findOne({
      where: { paisId, clave },
    });

    if (!item) {
      item = this.configPaisRepository.create({
        paisId,
        clave,
        valor,
        descripcion: descripcion ?? null,
      });
    } else {
      item.valor = valor;
      if (descripcion !== undefined) {
        item.descripcion = descripcion;
      }
    }

    const saved = await this.configPaisRepository.save(item);

    return {
      clave: saved.clave,
      valor: saved.valor,
      descripcion: saved.descripcion,
    };
  }

  async findPlantillaTareas(
    paisId: number,
    soloActivos = false,
  ): Promise<PlantillaTareaItem[]> {
    const items = await this.plantillaRepository.find({
      where: soloActivos ? { paisId, activo: true } : { paisId },
      order: { orden: 'ASC', nombre: 'ASC' },
    });

    return items.map((item) => this.toPlantillaItem(item));
  }

  async seedConfiguracionDefault(
    paisId: number,
    codigoIso: string,
  ): Promise<number> {
    let inserted = 0;

    for (const defaults of PAIS_CONFIG_DEFAULTS) {
      const exists = await this.configPaisRepository.exists({
        where: { paisId, clave: defaults.clave },
      });

      if (exists) {
        continue;
      }

      let valor = defaults.valor;

      if (defaults.clave === PAIS_CONFIG_CALIFICACION_PUNTOS) {
        valor = codigoIso.toUpperCase() === 'CO' ? 'true' : 'false';
      }

      if (defaults.clave === PAIS_CONFIG_MARGEN_CASI_PCT) {
        const global = await this.getValor(paisId, defaults.clave);
        if (global) {
          valor = global;
        }
      }

      await this.configPaisRepository.save(
        this.configPaisRepository.create({
          paisId,
          clave: defaults.clave,
          valor,
          descripcion: defaults.descripcion,
        }),
      );
      inserted += 1;
    }

    return inserted;
  }

  async seedPlantillaTareasDefault(paisId: number): Promise<number> {
    const existing = await this.plantillaRepository.count({ where: { paisId } });

    if (existing > 0) {
      return 0;
    }

    const rows = PLANTILLA_TAREAS_DEFAULT.map((item) =>
      this.plantillaRepository.create({
        paisId,
        codigo: item.codigo,
        nombre: item.nombre,
        orden: item.orden,
        activo: true,
        aplicaRfi: item.aplicaRfi,
        requiereFechaAdquisicion: item.requiereFechaAdquisicion,
      }),
    );

    await this.plantillaRepository.save(rows);

    return rows.length;
  }

  async createPlantillaTarea(
    paisId: number,
    data: {
      nombre: string;
      orden?: number;
      aplicaRfi?: boolean;
      requiereFechaAdquisicion?: boolean;
    },
  ): Promise<PlantillaTareaItem> {
    const nombre = data.nombre.trim();
    const codigo = await this.generarCodigoUnico(paisId, nombre);
    const orden = await this.resolverOrdenPlantilla(paisId, data.orden);

    const saved = await this.plantillaRepository.save(
      this.plantillaRepository.create({
        paisId,
        codigo,
        nombre,
        orden,
        activo: true,
        aplicaRfi: data.aplicaRfi ?? false,
        requiereFechaAdquisicion: data.requiereFechaAdquisicion ?? false,
      }),
    );

    return this.toPlantillaItem(saved);
  }

  async updatePlantillaTarea(
    paisId: number,
    id: number,
    patch: Partial<
      Pick<
        PlantillaTareaPais,
        'nombre' | 'orden' | 'activo' | 'aplicaRfi' | 'requiereFechaAdquisicion'
      >
    >,
  ): Promise<PlantillaTareaItem> {
    const item = await this.plantillaRepository.findOne({
      where: { id, paisId },
    });

    if (!item) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Tarea de plantilla no encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    Object.assign(item, patch);
    const saved = await this.plantillaRepository.save(item);

    return this.toPlantillaItem(saved);
  }

  async clonarPlantillaDesdePais(
    paisDestinoId: number,
    paisOrigenId: number,
  ): Promise<number> {
    const fuente = await this.plantillaRepository.find({
      where: { paisId: paisOrigenId },
    });

    let inserted = 0;

    for (const item of fuente) {
      const exists = await this.plantillaRepository.exists({
        where: { paisId: paisDestinoId, codigo: item.codigo },
      });

      if (exists) {
        continue;
      }

      await this.plantillaRepository.save(
        this.plantillaRepository.create({
          paisId: paisDestinoId,
          codigo: item.codigo,
          nombre: item.nombre,
          orden: item.orden,
          activo: item.activo,
          aplicaRfi: item.aplicaRfi,
          requiereFechaAdquisicion: item.requiereFechaAdquisicion,
        }),
      );
      inserted += 1;
    }

    return inserted;
  }

  async clonarConfigDesdePais(
    paisDestinoId: number,
    paisOrigenId: number,
  ): Promise<number> {
    const fuente = await this.configPaisRepository.find({
      where: { paisId: paisOrigenId },
    });

    let inserted = 0;

    for (const item of fuente) {
      const exists = await this.configPaisRepository.exists({
        where: { paisId: paisDestinoId, clave: item.clave },
      });

      if (exists) {
        continue;
      }

      await this.configPaisRepository.save(
        this.configPaisRepository.create({
          paisId: paisDestinoId,
          clave: item.clave,
          valor: item.valor,
          descripcion: item.descripcion,
        }),
      );
      inserted += 1;
    }

    return inserted;
  }

  private async resolverOrdenPlantilla(
    paisId: number,
    orden?: number,
  ): Promise<number> {
    if (orden !== undefined && orden >= 1) {
      return orden;
    }

    const items = await this.plantillaRepository.find({
      where: { paisId },
      select: { orden: true },
    });

    const maxOrden = items.reduce((max, item) => Math.max(max, item.orden), 0);

    return maxOrden + 1;
  }

  private async generarCodigoUnico(
    paisId: number,
    nombre: string,
  ): Promise<string> {
    const base = generarCodigoTarea(nombre);
    let codigo = base;
    let suffix = 2;

    while (
      await this.plantillaRepository.exists({
        where: { paisId, codigo },
      })
    ) {
      codigo = `${base}_${suffix}`;
      suffix += 1;
    }

    return codigo;
  }

  private toPlantillaItem(item: PlantillaTareaPais): PlantillaTareaItem {
    return {
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      orden: item.orden,
      activo: item.activo,
      aplicaRfi: item.aplicaRfi,
      requiereFechaAdquisicion: item.requiereFechaAdquisicion,
    };
  }
}
