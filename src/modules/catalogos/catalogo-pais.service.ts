import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { getCatalogoSeedForCountry } from '../../common/constants/catalogo-pais-seed.constants';
import { generarCodigoCatalogo } from '../../common/utils/codigo-catalogo.util';
import { CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { CatalogoPais } from '../../database/entities/catalogo-pais.entity';
import { Cliente } from '../../database/entities/cliente.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';

export interface CatalogoPaisItem {
  id: number;
  tipo: CatalogoPaisTipo;
  codigo: string;
  etiqueta: string;
  orden: number;
  activo: boolean;
}

export interface EtiquetasGeoPais {
  nivel1: string;
  nivel2: string;
}

@Injectable()
export class CatalogoPaisService {
  constructor(
    @InjectRepository(CatalogoPais)
    private readonly catalogoRepository: Repository<CatalogoPais>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
  ) {}

  async findByTipo(
    paisId: number,
    tipo: CatalogoPaisTipo,
    soloActivos = false,
  ): Promise<CatalogoPaisItem[]> {
    const items = await this.catalogoRepository.find({
      where: soloActivos ? { paisId, tipo, activo: true } : { paisId, tipo },
      order: { orden: 'ASC', etiqueta: 'ASC' },
    });

    return items.map((item) => this.toItem(item));
  }

  async findAll(paisId: number, soloActivos = false): Promise<CatalogoPaisItem[]> {
    const qb = this.catalogoRepository
      .createQueryBuilder('c')
      .where('c.pais_id = :paisId', { paisId })
      .orderBy('c.tipo', 'ASC')
      .addOrderBy('c.orden', 'ASC')
      .addOrderBy('c.etiqueta', 'ASC');

    if (soloActivos) {
      qb.andWhere('c.activo = :activo', { activo: true });
    }

    const items = await qb.getMany();
    return items.map((item) => this.toItem(item));
  }

  async getEtiquetasGeo(paisId: number): Promise<EtiquetasGeoPais> {
    const nivel1 = await this.catalogoRepository.findOne({
      where: { paisId, tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL1, activo: true },
    });
    const nivel2 = await this.catalogoRepository.findOne({
      where: { paisId, tipo: CatalogoPaisTipo.ETIQUETA_GEO_NIVEL2, activo: true },
    });

    return {
      nivel1: nivel1?.etiqueta ?? 'Departamento',
      nivel2: nivel2?.etiqueta ?? 'Municipio',
    };
  }

  async getIndicadoresActivos(paisId: number): Promise<string[]> {
    const items = await this.findByTipo(paisId, CatalogoPaisTipo.INDICADOR, true);
    return items.map((item) => item.codigo);
  }

  async assertCodigoActivo(
    paisId: number,
    tipo: CatalogoPaisTipo,
    codigo: string,
    campo = 'valor',
  ): Promise<void> {
    const item = await this.catalogoRepository.findOne({
      where: { paisId, tipo, codigo, activo: true },
    });

    if (!item) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        `El ${campo} "${codigo}" no está habilitado para este país`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async assertIndicadoresCompletos(
    paisId: number,
    codigos: string[],
  ): Promise<void> {
    const activos = await this.getIndicadoresActivos(paisId);
    const faltantes = activos.filter((codigo) => !codigos.includes(codigo));

    if (faltantes.length > 0 || codigos.length !== activos.length) {
      throw new BusinessException(
        ErrorCode.PROCESO_INDICADORES_INCOMPLETOS,
        `Debe registrar todos los indicadores financieros activos del país (${activos.join(', ')})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const codigo of codigos) {
      await this.assertCodigoActivo(
        paisId,
        CatalogoPaisTipo.INDICADOR,
        codigo,
        'indicador',
      );
    }
  }

  async seedDefaults(paisId: number, codigoIso: string): Promise<number> {
    const seeds = getCatalogoSeedForCountry(codigoIso);
    let inserted = 0;

    for (const seed of seeds) {
      const exists = await this.catalogoRepository.exists({
        where: { paisId, tipo: seed.tipo, codigo: seed.codigo },
      });

      if (exists) {
        continue;
      }

      await this.catalogoRepository.save(
        this.catalogoRepository.create({
          paisId,
          tipo: seed.tipo,
          codigo: seed.codigo,
          etiqueta: seed.etiqueta,
          orden: seed.orden,
          activo: true,
        }),
      );
      inserted += 1;
    }

    return inserted;
  }

  async createItem(
    paisId: number,
    data: {
      tipo: CatalogoPaisTipo;
      codigo?: string;
      etiqueta: string;
      orden?: number;
    },
  ): Promise<CatalogoPaisItem> {
    const etiqueta = data.etiqueta.trim();
    const codigoBase =
      data.codigo?.trim() || generarCodigoCatalogo(etiqueta, data.tipo);
    const codigo = await this.generarCodigoUnico(paisId, data.tipo, codigoBase);
    const orden = await this.resolverOrdenCatalogo(paisId, data.tipo, data.orden);

    const saved = await this.catalogoRepository.save(
      this.catalogoRepository.create({
        paisId,
        tipo: data.tipo,
        codigo,
        etiqueta,
        orden,
        activo: true,
      }),
    );

    return this.toItem(saved);
  }

  async updateItem(
    paisId: number,
    id: number,
    patch: Partial<Pick<CatalogoPais, 'etiqueta' | 'orden' | 'activo'>>,
  ): Promise<CatalogoPaisItem> {
    const item = await this.catalogoRepository.findOne({ where: { id, paisId } });

    if (!item) {
      throw new BusinessException(
        ErrorCode.UBICACION_NO_ENCONTRADA,
        'Ítem de catálogo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (patch.activo === false) {
      const enUso = await this.estaEnUso(paisId, item.tipo, item.codigo);
      if (enUso) {
        throw new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          'No se puede desactivar: el ítem está en uso. Manténgalo activo o reasigne los registros existentes.',
          HttpStatus.CONFLICT,
        );
      }
    }

    Object.assign(item, patch);
    const saved = await this.catalogoRepository.save(item);
    return this.toItem(saved);
  }

  async clonarDesdePais(
    paisDestinoId: number,
    paisOrigenId: number,
  ): Promise<number> {
    const fuente = await this.catalogoRepository.find({
      where: { paisId: paisOrigenId },
    });

    let inserted = 0;

    for (const item of fuente) {
      const exists = await this.catalogoRepository.exists({
        where: {
          paisId: paisDestinoId,
          tipo: item.tipo,
          codigo: item.codigo,
        },
      });

      if (exists) {
        continue;
      }

      await this.catalogoRepository.save(
        this.catalogoRepository.create({
          paisId: paisDestinoId,
          tipo: item.tipo,
          codigo: item.codigo,
          etiqueta: item.etiqueta,
          orden: item.orden,
          activo: item.activo,
        }),
      );
      inserted += 1;
    }

    return inserted;
  }

  async countActivosPorTipos(
    paisId: number,
    tipos: CatalogoPaisTipo[],
  ): Promise<number> {
    if (tipos.length === 0) {
      return 0;
    }

    return this.catalogoRepository.count({
      where: { paisId, tipo: In(tipos), activo: true },
    });
  }

  private async estaEnUso(
    paisId: number,
    tipo: CatalogoPaisTipo,
    codigo: string,
  ): Promise<boolean> {
    if (tipo === CatalogoPaisTipo.SEGMENTO_PROCESO) {
      return this.procesoRepository.exists({
        where: { paisId, segmento: codigo },
      });
    }

    if (tipo === CatalogoPaisTipo.SEGMENTO_CLIENTE) {
      return this.clienteRepository.exists({
        where: { paisId, segmento: codigo },
      });
    }

    if (tipo === CatalogoPaisTipo.PORTAL_ORIGEN) {
      return this.procesoRepository.exists({
        where: { paisId, portalOrigen: codigo },
      });
    }

    return false;
  }

  private async resolverOrdenCatalogo(
    paisId: number,
    tipo: CatalogoPaisTipo,
    orden?: number,
  ): Promise<number> {
    if (orden !== undefined && orden >= 1) {
      return orden;
    }

    const items = await this.catalogoRepository.find({
      where: { paisId, tipo },
      select: { orden: true },
    });

    const maxOrden = items.reduce((max, item) => Math.max(max, item.orden), 0);

    return maxOrden + 1;
  }

  private async generarCodigoUnico(
    paisId: number,
    tipo: CatalogoPaisTipo,
    base: string,
  ): Promise<string> {
    let codigo = base;
    let suffix = 2;

    while (
      await this.catalogoRepository.exists({
        where: { paisId, tipo, codigo },
      })
    ) {
      codigo = `${base}_${suffix}`;
      suffix += 1;
    }

    return codigo;
  }

  private toItem(item: CatalogoPais): CatalogoPaisItem {
    return {
      id: item.id,
      tipo: item.tipo,
      codigo: item.codigo,
      etiqueta: item.etiqueta,
      orden: item.orden,
      activo: item.activo,
    };
  }
}
