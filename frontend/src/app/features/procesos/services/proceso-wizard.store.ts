import { Injectable, signal } from '@angular/core';
import {
  CreateProcesoPayload,
  INDICADORES_ORDEN,
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';
import { PortalOrigen } from '../../../core/models/portal-origen.model';

@Injectable({ providedIn: 'root' })
export class ProcesoWizardStore {
  readonly step = signal(1);

  readonly paso1 = signal({
    idDigitado: '',
    empresaClienteId: null as number | null,
    empresaOtro: '',
    usarOtro: false,
    contactoIds: [] as number[],
    departamento: '',
    ubicacionId: null as number | null,
    portalOrigen: '',
    portalOrigenOtro: '',
    link: '',
    objeto: '',
    cuantia: null as number | null,
    segmento: '',
    tipoProceso: TipoProceso.Periodico,
    tipoInstrumento: TipoInstrumento.Licitacion,
    plazoEjecucionMeses: 12,
    experiencia: false,
    observacion: '',
  });

  readonly paso2 = signal<{
    anioParametros: number;
    indicadores: Array<{ indicadorCodigo: string; valorRequerido: number | null }>;
  }>({
    anioParametros: new Date().getFullYear() - 1,
    indicadores: INDICADORES_ORDEN.map((codigo) => ({
      indicadorCodigo: codigo,
      valorRequerido: null,
    })),
  });

  readonly paso3 = signal({
    fechaApertura: '',
    fechaCierre: '',
  });

  readonly confirmarIndicadoresVacios = signal(false);

  next(): void {
    this.step.update((s) => Math.min(3, s + 1));
  }

  prev(): void {
    this.step.update((s) => Math.max(1, s - 1));
  }

  toPayload(): CreateProcesoPayload {
    const p1 = this.paso1();
    const p3 = this.paso3();

    const payload: CreateProcesoPayload = {
      idDigitado: p1.idDigitado.trim(),
      ubicacionId: p1.ubicacionId!,
      cuantia: Number(p1.cuantia),
      segmento: p1.segmento,
      tipoProceso: p1.tipoProceso,
      tipoInstrumento: p1.tipoInstrumento,
      plazoEjecucionMeses: Number(p1.plazoEjecucionMeses),
      experiencia: p1.experiencia,
      indicadores: this.paso2().indicadores.map((i) => ({
        indicadorCodigo: i.indicadorCodigo,
        valorRequerido: i.valorRequerido,
      })),
      anioParametros: this.paso2().anioParametros,
      fechaApertura: p3.fechaApertura,
      fechaCierre: p3.fechaCierre,
    };

    if (p1.portalOrigen) {
      payload.portalOrigen = p1.portalOrigen;
      if (p1.portalOrigen === PortalOrigen.Otro && p1.portalOrigenOtro.trim()) {
        payload.portalOrigenOtro = p1.portalOrigenOtro.trim();
      }
    }
    if (p1.link) payload.link = p1.link;
    if (p1.objeto?.trim()) payload.objeto = p1.objeto.trim();
    if (p1.experiencia && p1.observacion) payload.observacion = p1.observacion;

    if (p1.usarOtro) {
      payload.empresaOtro = p1.empresaOtro.trim();
    } else if (p1.empresaClienteId) {
      payload.empresaClienteId = p1.empresaClienteId;
      payload.contactoIds = [...p1.contactoIds];
    }

    if (this.confirmarIndicadoresVacios()) {
      payload.confirmarIndicadoresVacios = true;
    }

    return payload;
  }

  syncIndicadores(codigos: string[]): void {
    const actuales = this.paso2().indicadores;
    const mapa = new Map(actuales.map((item) => [item.indicadorCodigo, item.valorRequerido]));

    this.paso2.update((paso) => ({
      ...paso,
      indicadores: codigos.map((codigo) => ({
        indicadorCodigo: codigo,
        valorRequerido: mapa.get(codigo) ?? null,
      })),
    }));
  }

  setSegmentoDefault(segmento: string): void {
    this.paso1.update((paso) => ({ ...paso, segmento: paso.segmento || segmento }));
  }

  hasIndicadoresVacios(): boolean {
    return this.paso2().indicadores.some(
      (i) => i.valorRequerido === null || i.valorRequerido === undefined,
    );
  }

  reset(): void {
    this.step.set(1);
    this.confirmarIndicadoresVacios.set(false);
    this.paso1.set({
      idDigitado: '',
      empresaClienteId: null,
      empresaOtro: '',
      usarOtro: false,
      contactoIds: [],
      departamento: '',
      ubicacionId: null,
      portalOrigen: '',
      portalOrigenOtro: '',
      link: '',
      objeto: '',
      cuantia: null,
      segmento: '',
      tipoProceso: TipoProceso.Periodico,
      tipoInstrumento: TipoInstrumento.Licitacion,
      plazoEjecucionMeses: 12,
      experiencia: false,
      observacion: '',
    });
    this.paso2.set({
      anioParametros: new Date().getFullYear() - 1,
      indicadores: INDICADORES_ORDEN.map((codigo) => ({
        indicadorCodigo: codigo,
        valorRequerido: null,
      })),
    });
    this.paso3.set({ fechaApertura: '', fechaCierre: '' });
  }
}
