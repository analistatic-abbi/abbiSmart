import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClienteOption, UbicacionOption } from '../models/proceso.model';
import {
  CreatePaisPayload,
  Pais,
  PaisReferencia,
  UpdatePaisPayload,
} from '../models/pais.model';
import {
  CatalogoPaisItem,
  CatalogoPaisTipo,
  ConfiguracionPaisItem,
  PaisCapabilities,
  PlantillaTareaPais,
} from '../models/pais-config.model';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  getPaises(): Observable<{ data: Array<{ id: number; nombre: string; activo?: boolean; codigoIso?: string | null; codigoMoneda?: string | null }> }> {
    return this.http.get<{ data: Array<{ id: number; nombre: string; activo?: boolean; codigoIso?: string | null; codigoMoneda?: string | null }> }>(
      `${this.base}/catalogos/paises`,
    );
  }

  getPaisesCatalogo(): Observable<{ message: string; data: Pais[] }> {
    return this.http.get<{ message: string; data: Pais[] }>(`${this.base}/catalogos/paises`);
  }

  getPaisesReferencia(): Observable<{ message: string; data: PaisReferencia[] }> {
    return this.http.get<{ message: string; data: PaisReferencia[] }>(
      `${this.base}/catalogos/paises/referencia`,
    );
  }

  createPais(payload: CreatePaisPayload): Observable<{
    message: string;
    pais: Pais;
    onboarding?: {
      ubicaciones: { inserted: number; total: number; skipped: boolean };
      tareasPlantilla: number;
      configItems: number;
      catalogosItems: number;
      parametrosClonados: number;
    };
  }> {
    return this.http.post<{
      message: string;
      pais: Pais;
      onboarding?: {
        ubicaciones: { inserted: number; total: number; skipped: boolean };
        tareasPlantilla: number;
        configItems: number;
        catalogosItems: number;
      parametrosClonados: number;
      };
    }>(`${this.base}/catalogos/paises`, payload);
  }

  getCapabilitiesSesion(): Observable<{ message: string; data: PaisCapabilities }> {
    return this.http.get<{ message: string; data: PaisCapabilities }>(
      `${this.base}/catalogos/paises/sesion/capabilities`,
    );
  }

  getCapabilitiesPais(id: number): Observable<{ message: string; data: PaisCapabilities }> {
    return this.http.get<{ message: string; data: PaisCapabilities }>(
      `${this.base}/catalogos/paises/${id}/capabilities`,
    );
  }

  getConfiguracionPais(id: number): Observable<{ message: string; data: ConfiguracionPaisItem[] }> {
    return this.http.get<{ message: string; data: ConfiguracionPaisItem[] }>(
      `${this.base}/catalogos/paises/${id}/configuracion`,
    );
  }

  updateConfiguracionPais(
    id: number,
    clave: string,
    valor: string,
  ): Observable<{ message: string; item: ConfiguracionPaisItem }> {
    return this.http.patch<{ message: string; item: ConfiguracionPaisItem }>(
      `${this.base}/catalogos/paises/${id}/configuracion/${clave}`,
      { valor },
    );
  }

  getPlantillaTareasPais(id: number): Observable<{ message: string; data: PlantillaTareaPais[] }> {
    return this.http.get<{ message: string; data: PlantillaTareaPais[] }>(
      `${this.base}/catalogos/paises/${id}/plantilla-tareas`,
    );
  }

  updatePlantillaTareaPais(
    paisId: number,
    tareaId: number,
    payload: Partial<
      Pick<PlantillaTareaPais, 'nombre' | 'orden' | 'activo' | 'aplicaRfi' | 'requiereFechaAdquisicion'>
    >,
  ): Observable<{ message: string; item: PlantillaTareaPais }> {
    return this.http.patch<{ message: string; item: PlantillaTareaPais }>(
      `${this.base}/catalogos/paises/${paisId}/plantilla-tareas/${tareaId}`,
      payload,
    );
  }

  createPlantillaTareaPais(
    paisId: number,
    payload: Pick<PlantillaTareaPais, 'nombre'> &
      Partial<Pick<PlantillaTareaPais, 'orden' | 'aplicaRfi' | 'requiereFechaAdquisicion'>>,
  ): Observable<{ message: string; item: PlantillaTareaPais }> {
    return this.http.post<{ message: string; item: PlantillaTareaPais }>(
      `${this.base}/catalogos/paises/${paisId}/plantilla-tareas`,
      payload,
    );
  }

  sincronizarUbicacionesPais(id: number): Observable<{
    message: string;
    pais: Pais;
    ubicaciones: { inserted: number; total: number; skipped: boolean };
  }> {
    return this.http.post<{
      message: string;
      pais: Pais;
      ubicaciones: { inserted: number; total: number; skipped: boolean };
    }>(`${this.base}/catalogos/paises/${id}/ubicaciones/sincronizar`, {});
  }

  updatePais(id: number, payload: UpdatePaisPayload): Observable<{ message: string; pais: Pais }> {
    return this.http.patch<{ message: string; pais: Pais }>(
      `${this.base}/catalogos/paises/${id}`,
      payload,
    );
  }

  getCatalogoSesion(
    tipo: CatalogoPaisTipo,
    soloActivos = true,
  ): Observable<{ message: string; data: CatalogoPaisItem[] }> {
    return this.http.get<{ message: string; data: CatalogoPaisItem[] }>(
      `${this.base}/catalogos/catalogo`,
      { params: { tipo, soloActivos } },
    );
  }

  getCatalogoPais(
    paisId: number,
    tipo?: CatalogoPaisTipo,
    soloActivos = false,
  ): Observable<{ message: string; data: CatalogoPaisItem[] }> {
    const params: Record<string, string> = {};
    if (tipo) params['tipo'] = tipo;
    if (soloActivos) params['soloActivos'] = 'true';

    return this.http.get<{ message: string; data: CatalogoPaisItem[] }>(
      `${this.base}/catalogos/paises/${paisId}/catalogo`,
      { params },
    );
  }

  createCatalogoPais(
    paisId: number,
    payload: { tipo: CatalogoPaisTipo; etiqueta: string; codigo?: string; orden?: number },
  ): Observable<{ message: string; item: CatalogoPaisItem }> {
    return this.http.post<{ message: string; item: CatalogoPaisItem }>(
      `${this.base}/catalogos/paises/${paisId}/catalogo`,
      payload,
    );
  }

  updateCatalogoPais(
    paisId: number,
    itemId: number,
    payload: Partial<Pick<CatalogoPaisItem, 'etiqueta' | 'orden' | 'activo'>>,
  ): Observable<{ message: string; item: CatalogoPaisItem }> {
    return this.http.patch<{ message: string; item: CatalogoPaisItem }>(
      `${this.base}/catalogos/paises/${paisId}/catalogo/${itemId}`,
      payload,
    );
  }

  resyncOnboardingPais(paisId: number): Observable<{
    message: string;
    onboarding: {
      ubicaciones: { inserted: number; total: number; skipped: boolean };
      tareasPlantilla: number;
      configItems: number;
      catalogosItems: number;
      parametrosClonados: number;
    };
  }> {
    return this.http.post<{
      message: string;
      onboarding: {
        ubicaciones: { inserted: number; total: number; skipped: boolean };
        tareasPlantilla: number;
        configItems: number;
        catalogosItems: number;
        parametrosClonados: number;
      };
    }>(`${this.base}/catalogos/paises/${paisId}/onboarding/resync`, {});
  }

  clonarConfiguracionPais(
    paisId: number,
    paisOrigenId: number,
  ): Observable<{
    message: string;
    catalogosClonados: number;
    tareasClonadas: number;
    configClonada: number;
  }> {
    return this.http.post<{
      message: string;
      catalogosClonados: number;
      tareasClonadas: number;
      configClonada: number;
    }>(`${this.base}/catalogos/paises/${paisId}/configuracion/clonar`, {
      paisOrigenId,
    });
  }

  getDepartamentos(): Observable<{ data: string[] }> {
    return this.http.get<{ data: string[] }>(`${this.base}/catalogos/ubicaciones/departamentos`);
  }

  getMunicipios(departamento: string): Observable<{ data: UbicacionOption[]; total: number }> {
    return this.http.get<{ data: UbicacionOption[]; total: number }>(
      `${this.base}/catalogos/ubicaciones`,
      { params: { departamento, limit: 200 } },
    );
  }

  getClientes(search = ''): Observable<{ data: ClienteOption[] }> {
    return this.http.get<{ data: ClienteOption[] }>(`${this.base}/clientes`, {
      params: { page: 1, limit: 100, search },
    });
  }
}
