import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { ProcesosService } from '../../../core/services/procesos.service';
import {
  ParametroPorAnioResponseItem,
  ParametrosService,
} from '../../../core/services/parametros.service';
import {
  INDICADORES_ORDEN,
  SegmentoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';
import { ProcesoWizardStore } from '../services/proceso-wizard.store';
import { ApiErrorBody } from '../../../core/models/auth.model';
import { HttpErrorResponse } from '@angular/common/http';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { formatParametroValor, indicadorValorHint } from '../../../core/utils/parametro.util';
import { esDecimalEnEdicion, parseDecimalInput } from '../../../core/utils/decimal-input.util';

const CUANTIA_MAX_ENTEROS = 16;

function cuantiaExcedeMaximo(value: number): boolean {
  const [entero = ''] = Math.abs(value).toLocaleString('fullwide', {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).split('.');
  return entero.length > CUANTIA_MAX_ENTEROS;
}

@Component({
  selector: 'app-proceso-create',
  standalone: true,
  imports: [FormsModule, SearchableSelectComponent],
  templateUrl: './proceso-create.component.html',
  styleUrl: './proceso-create.component.scss',
})
export class ProcesoCreateComponent implements OnInit {
  private readonly catalogos = inject(CatalogosService);
  private readonly procesos = inject(ProcesosService);
  private readonly parametros = inject(ParametrosService);
  private readonly router = inject(Router);
  protected readonly store = inject(ProcesoWizardStore);

  protected readonly segmentos = Object.values(SegmentoProceso);
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);
  protected readonly indicadores = INDICADORES_ORDEN;
  protected readonly anioActual = new Date().getFullYear();
  protected readonly formatReferencia = formatParametroValor;
  protected readonly valorHint = indicadorValorHint;

  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly referencias = signal<ParametroPorAnioResponseItem[]>([]);
  protected readonly referenciasLoading = signal(false);
  protected readonly clienteOptions = computed(() =>
    this.clientes().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showConfirmVacios = signal(false);

  ngOnInit(): void {
    this.catalogos.getDepartamentos().subscribe((r) => this.departamentos.set(r.data));
    this.catalogos.getClientes().subscribe((r) => this.clientes.set(r.data));
    this.loadReferencias();
  }

  protected onDepartamentoChange(departamento: string): void {
    this.store.paso1.update((p) => ({ ...p, departamento, ubicacionId: null }));
    if (!departamento) {
      this.municipios.set([]);
      return;
    }
    this.catalogos.getMunicipios(departamento).subscribe((r) =>
      this.municipios.set(
        r.data.map((u) => ({ id: u.id, municipio: u.municipioProvincia })),
      ),
    );
  }

  protected updatePaso1(field: string, value: unknown): void {
    this.store.paso1.update((p) => ({ ...p, [field]: value }));
  }

  protected onAnioParametrosChange(value: number | string): void {
    const anio = Number(value);
    if (!Number.isFinite(anio)) return;
    this.store.paso2.update((paso) => ({ ...paso, anioParametros: anio }));
    this.loadReferencias();
  }

  protected updateIndicador(index: number, value: string): void {
    if (esDecimalEnEdicion(value)) {
      return;
    }
    const num = parseDecimalInput(value);
    this.store.paso2.update((paso) => ({
      ...paso,
      indicadores: paso.indicadores.map((item, i) =>
        i === index ? { ...item, valorRequerido: num } : item,
      ),
    }));
  }

  protected indicadorDisplayValue(valor: number | null): string {
    return valor === null || valor === undefined ? '' : String(valor);
  }

  private validarPasoActual(): string | null {
    const paso = this.store.step();
    const p1 = this.store.paso1();
    const p3 = this.store.paso3();

    if (paso === 1) {
      const faltantes: string[] = [];
      if (!p1.idDigitado.trim()) faltantes.push('ID digitado');
      if (p1.usarOtro) {
        if (!p1.empresaOtro.trim()) faltantes.push('empresa en "Otro"');
      } else if (!p1.empresaClienteId) {
        faltantes.push('cliente');
      }
      if (!p1.ubicacionId) faltantes.push('ubicación');
      if (p1.cuantia === null || p1.cuantia === undefined || Number.isNaN(p1.cuantia)) {
        faltantes.push('cuantía');
      } else if (cuantiaExcedeMaximo(p1.cuantia)) {
        return 'La cuantía no puede superar 9.999.999.999.999.999,99 (máximo 16 dígitos enteros).';
      }
      if (faltantes.length) {
        return `Complete: ${faltantes.join(', ')}.`;
      }
      return null;
    }

    if (paso === 3) {
      const faltantes: string[] = [];
      if (!p3.fechaApertura) faltantes.push('fecha de apertura');
      if (!p3.fechaCierre) faltantes.push('fecha de cierre');
      if (faltantes.length) {
        return `Complete: ${faltantes.join(' y ')}.`;
      }
      return null;
    }

    return null;
  }

  protected referenciaPara(indicadorCodigo: string): string {
    const item = this.referencias().find((ref) => ref.indicadorCodigo === indicadorCodigo);
    if (!item?.valor) return 'Sin parámetro';
    return this.formatReferencia(item.indicadorCodigo, item.valor);
  }

  protected continuar(): void {
    this.error.set(null);
    const validacion = this.validarPasoActual();
    if (validacion) {
      this.error.set(validacion);
      return;
    }
    if (this.store.step() === 2 && this.store.hasIndicadoresVacios()) {
      this.showConfirmVacios.set(true);
      return;
    }
    this.store.next();
  }

  protected confirmarVacios(): void {
    this.store.confirmarIndicadoresVacios.set(true);
    this.showConfirmVacios.set(false);
    this.store.next();
  }

  protected updatePaso3(field: 'fechaApertura' | 'fechaCierre', value: string): void {
    this.store.paso3.update((p) => ({ ...p, [field]: value }));
  }

  protected crear(): void {
    this.error.set(null);
    const validacion = this.validarPasoActual();
    if (validacion) {
      this.error.set(validacion);
      return;
    }
    this.loading.set(true);

    this.procesos.create(this.store.toPayload()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.store.reset();
        void this.router.navigate(['/procesos', res.proceso.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const body = err.error as ApiErrorBody;
        if (body?.errorCode === 'PROCESO_INDICADORES_VACIOS_SIN_CONFIRMACION') {
          this.showConfirmVacios.set(true);
          return;
        }
        this.error.set(body?.message ?? 'No fue posible crear el proceso.');
      },
    });
  }

  private loadReferencias(): void {
    const anio = this.store.paso2().anioParametros;
    this.referenciasLoading.set(true);
    this.parametros.getPorAnio(anio).subscribe({
      next: (response) => {
        this.referencias.set(response.data.indicadores);
        this.referenciasLoading.set(false);
      },
      error: () => {
        this.referencias.set([]);
        this.referenciasLoading.set(false);
      },
    });
  }
}
