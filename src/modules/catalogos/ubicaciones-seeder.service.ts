import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { City, Country, State } from 'country-state-city';
import { Repository } from 'typeorm';
import { UbicacionGeografica } from '../../database/entities/ubicacion-geografica.entity';
import { normalizeColombiaUbicacionRows } from '../../common/utils/ubicacion-colombia.util';

export interface SeedUbicacionesResult {
  inserted: number;
  total: number;
  skipped: boolean;
}

const BATCH_SIZE = 400;

@Injectable()
export class UbicacionesSeederService {
  private readonly logger = new Logger(UbicacionesSeederService.name);

  constructor(
    @InjectRepository(UbicacionGeografica)
    private readonly ubicacionRepository: Repository<UbicacionGeografica>,
  ) {}

  async seedForCountry(
    paisId: number,
    codigoIso: string,
    options: { skipIfExists?: boolean } = { skipIfExists: true },
  ): Promise<SeedUbicacionesResult> {
    const iso = codigoIso.trim().toUpperCase();

    if (options.skipIfExists) {
      const existing = await this.ubicacionRepository.count({
        where: { paisId },
      });

      if (existing > 0) {
        return { inserted: 0, total: existing, skipped: true };
      }
    }

    const rows = this.buildRows(iso);

    if (rows.length === 0) {
      this.logger.warn(`No se generaron ubicaciones para el país ${iso}`);
      return { inserted: 0, total: 0, skipped: false };
    }

    const beforeCount = await this.ubicacionRepository.count({
      where: { paisId },
    });

    for (let index = 0; index < rows.length; index += BATCH_SIZE) {
      const chunk = rows.slice(index, index + BATCH_SIZE).map((row) => ({
        paisId,
        departamento: row.departamento,
        municipioProvincia: row.municipioProvincia,
      }));

      await this.ubicacionRepository
        .createQueryBuilder()
        .insert()
        .into(UbicacionGeografica)
        .values(chunk)
        .orIgnore()
        .execute();
    }

    const total = await this.ubicacionRepository.count({
      where: { paisId },
    });

    this.logger.log(
      `Ubicaciones para país ${iso} (id ${paisId}): ${total} total, ${total - beforeCount} nuevas`,
    );

    return {
      inserted: total - beforeCount,
      total,
      skipped: false,
    };
  }

  buildRows(
    codigoIso: string,
  ): Array<{ departamento: string; municipioProvincia: string }> {
    const states = State.getStatesOfCountry(codigoIso);
    const rows: Array<{ departamento: string; municipioProvincia: string }> =
      [];

    for (const state of states) {
      const departamento = state.name.trim();
      const cities = City.getCitiesOfState(codigoIso, state.isoCode);

      if (cities.length > 0) {
        for (const city of cities) {
          rows.push({
            departamento,
            municipioProvincia: city.name.trim(),
          });
        }
        continue;
      }

      rows.push({
        departamento,
        municipioProvincia: departamento,
      });
    }

    if (rows.length === 0) {
      const country = Country.getCountryByCode(codigoIso);

      if (country) {
        const nombre = country.name.trim();
        rows.push({
          departamento: nombre,
          municipioProvincia: nombre,
        });
      }
    }

    return this.dedupeRows(
      codigoIso === 'CO' ? normalizeColombiaUbicacionRows(rows) : rows,
    );
  }

  private dedupeRows(
    rows: Array<{ departamento: string; municipioProvincia: string }>,
  ): Array<{ departamento: string; municipioProvincia: string }> {
    const seen = new Set<string>();

    return rows.filter((row) => {
      const key = `${row.departamento}\0${row.municipioProvincia}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }
}
