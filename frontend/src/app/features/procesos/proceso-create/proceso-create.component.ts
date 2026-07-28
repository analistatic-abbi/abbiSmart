import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { ProcesosService } from '../../../core/services/procesos.service';
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
  private readonly router = inject(Router);
  protected readonly store = inject(ProcesoWizardStore);

  protected readonly segmentos = Object.values(SegmentoProceso);
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);
  protected readonly indicadores = INDICADORES_ORDEN;

  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
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

  protected updateIndicador(index: number, value: string): void {
    const num = value === '' ? null : Number(value);
    this.store.paso2.update((items) =>
      items.map((item, i) => (i === index ? { ...item, valorRequerido: num } : item)),
    );
  }

  protected continuar(): void {
    this.error.set(null);
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
}
