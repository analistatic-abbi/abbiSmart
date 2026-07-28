import { Injectable, signal } from '@angular/core';
import {
  CreateProcesoPayload,
  IndicadorCodigo,
  INDICADORES_ORDEN,
  SegmentoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';

@Injectable({ providedIn: 'root' })
export class ProcesoWizardStore {
  readonly step = signal(1);

  readonly paso1 = signal({
    idDigitado: '',
    empresaClienteId: null as number | null,
    empresaOtro: '',
    usarOtro: false,
    departamento: '',
    ubicacionId: null as number | null,
    portalOrigen: '',
    link: '',
    cuantia: null as number | null,
    segmento: SegmentoProceso.GasNatural,
    tipoProceso: TipoProceso.Periodico,
    tipoInstrumento: TipoInstrumento.Licitacion,
    plazoEjecucionMeses: 12,
    experiencia: false,
    observacion: '',
  });

  readonly paso2 = signal(
    INDICADORES_ORDEN.map((codigo) => ({
      indicadorCodigo: codigo,
      valorRequerido: null as number | null,
    })),
  );

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
      indicadores: this.paso2().map((i) => ({
        indicadorCodigo: i.indicadorCodigo as IndicadorCodigo,
        valorRequerido: i.valorRequerido,
      })),
      fechaApertura: p3.fechaApertura,
      fechaCierre: p3.fechaCierre,
    };

    if (p1.portalOrigen) payload.portalOrigen = p1.portalOrigen;
    if (p1.link) payload.link = p1.link;
    if (p1.experiencia && p1.observacion) payload.observacion = p1.observacion;

    if (p1.usarOtro) {
      payload.empresaOtro = p1.empresaOtro.trim();
    } else if (p1.empresaClienteId) {
      payload.empresaClienteId = p1.empresaClienteId;
    }

    if (this.confirmarIndicadoresVacios()) {
      payload.confirmarIndicadoresVacios = true;
    }

    return payload;
  }

  hasIndicadoresVacios(): boolean {
    return this.paso2().some((i) => i.valorRequerido === null || i.valorRequerido === undefined);
  }

  reset(): void {
    this.step.set(1);
    this.confirmarIndicadoresVacios.set(false);
    this.paso1.set({
      idDigitado: '',
      empresaClienteId: null,
      empresaOtro: '',
      usarOtro: false,
      departamento: '',
      ubicacionId: null,
      portalOrigen: '',
      link: '',
      cuantia: null,
      segmento: SegmentoProceso.GasNatural,
      tipoProceso: TipoProceso.Periodico,
      tipoInstrumento: TipoInstrumento.Licitacion,
      plazoEjecucionMeses: 12,
      experiencia: false,
      observacion: '',
    });
    this.paso2.set(
      INDICADORES_ORDEN.map((codigo) => ({
        indicadorCodigo: codigo,
        valorRequerido: null,
      })),
    );
    this.paso3.set({ fechaApertura: '', fechaCierre: '' });
  }
}
