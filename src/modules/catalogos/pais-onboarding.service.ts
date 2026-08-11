import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { INDICADORES_FINANCIEROS } from '../../common/enums/indicador-codigo.enum';
import { ParametroFinanciero } from '../../database/entities/parametro-financiero.entity';
import { Pais } from '../../database/entities/pais.entity';
import { CatalogoPaisService } from './catalogo-pais.service';
import { PaisConfigService } from './pais-config.service';
import { UbicacionesSeederService } from './ubicaciones-seeder.service';

export interface PaisOnboardingResult {
  ubicaciones: { inserted: number; total: number; skipped: boolean };
  tareasPlantilla: number;
  configItems: number;
  catalogosItems: number;
  parametrosClonados: number;
}

@Injectable()
export class PaisOnboardingService {
  private readonly logger = new Logger(PaisOnboardingService.name);

  constructor(
    @InjectRepository(Pais)
    private readonly paisRepository: Repository<Pais>,
    @InjectRepository(ParametroFinanciero)
    private readonly parametroRepository: Repository<ParametroFinanciero>,
    private readonly ubicacionesSeeder: UbicacionesSeederService,
    private readonly paisConfigService: PaisConfigService,
    private readonly catalogoPaisService: CatalogoPaisService,
  ) {}

  async onboard(
    paisId: number,
    codigoIso: string,
    actorId: number,
  ): Promise<PaisOnboardingResult> {
    const ubicaciones = await this.ubicacionesSeeder.seedForCountry(
      paisId,
      codigoIso,
    );

    const tareasPlantilla =
      await this.paisConfigService.seedPlantillaTareasDefault(paisId);

    const configItems = await this.paisConfigService.seedConfiguracionDefault(
      paisId,
      codigoIso,
    );

    const catalogosItems = await this.catalogoPaisService.seedDefaults(
      paisId,
      codigoIso,
    );

    const parametrosClonados = await this.clonarParametrosDesdePlantilla(
      paisId,
      actorId,
    );

    this.logger.log(
      `Onboarding país ${codigoIso} (id ${paisId}): ubicaciones=${ubicaciones.total}, tareas=${tareasPlantilla}, config=${configItems}, catálogos=${catalogosItems}, parámetros=${parametrosClonados}`,
    );

    return {
      ubicaciones,
      tareasPlantilla,
      configItems,
      catalogosItems,
      parametrosClonados,
    };
  }

  async resyncParcial(
    paisId: number,
    codigoIso: string,
    actorId: number,
  ): Promise<PaisOnboardingResult> {
    const ubicaciones = await this.ubicacionesSeeder.seedForCountry(
      paisId,
      codigoIso,
    );

    return {
      ubicaciones,
      tareasPlantilla:
        await this.paisConfigService.seedPlantillaTareasDefault(paisId),
      configItems: await this.paisConfigService.seedConfiguracionDefault(
        paisId,
        codigoIso,
      ),
      catalogosItems: await this.catalogoPaisService.seedDefaults(
        paisId,
        codigoIso,
      ),
      parametrosClonados: await this.clonarParametrosDesdePlantilla(
        paisId,
        actorId,
      ),
    };
  }

  async clonarConfiguracionDesdePais(
    paisDestinoId: number,
    paisOrigenId: number,
  ): Promise<{
    catalogosClonados: number;
    tareasClonadas: number;
    configClonada: number;
  }> {
    const catalogosClonados = await this.catalogoPaisService.clonarDesdePais(
      paisDestinoId,
      paisOrigenId,
    );

    const tareasClonadas =
      await this.paisConfigService.clonarPlantillaDesdePais(
        paisDestinoId,
        paisOrigenId,
      );

    const configClonada = await this.paisConfigService.clonarConfigDesdePais(
      paisDestinoId,
      paisOrigenId,
    );

    return { catalogosClonados, tareasClonadas, configClonada };
  }

  private async clonarParametrosDesdePlantilla(
    paisDestinoId: number,
    actorId: number,
  ): Promise<number> {
    const existentes = await this.parametroRepository.count({
      where: { paisId: paisDestinoId },
    });

    if (existentes > 0) {
      return 0;
    }

    const paisPlantilla = await this.paisRepository.findOne({
      where: { codigoIso: 'CO' },
    });

    if (!paisPlantilla || Number(paisPlantilla.id) === Number(paisDestinoId)) {
      return 0;
    }

    const anioReferencia = new Date().getFullYear() - 1;
    const fuente = await this.parametroRepository.find({
      where: { paisId: paisPlantilla.id, anio: anioReferencia },
    });

    if (fuente.length === 0) {
      return 0;
    }

    const rows = fuente.map((parametro) =>
      this.parametroRepository.create({
        paisId: paisDestinoId,
        indicadorCodigo: parametro.indicadorCodigo,
        anio: parametro.anio,
        valor: parametro.valor,
        reglaCumplimiento: parametro.reglaCumplimiento,
        usuarioModificoId: actorId,
      }),
    );

    await this.parametroRepository.save(rows);

    const faltantes = INDICADORES_FINANCIEROS.filter(
      (codigo) => !fuente.some((item) => item.indicadorCodigo === codigo),
    );

    if (faltantes.length > 0) {
      this.logger.warn(
        `País ${paisDestinoId}: faltan parámetros en plantilla CO para ${faltantes.join(', ')}`,
      );
    }

    return rows.length;
  }
}
