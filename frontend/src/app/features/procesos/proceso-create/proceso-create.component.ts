import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { ContactosService } from '../../../core/services/contactos.service';
import { ProcesosService } from '../../../core/services/procesos.service';
import {
  ParametroPorAnioResponseItem,
  ParametrosService,
} from '../../../core/services/parametros.service';
import {
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';
import { CatalogoPaisItem } from '../../../core/models/pais-config.model';
import { Contacto } from '../../../core/models/crm.model';
import { PortalOrigen, PORTAL_ORIGEN_OPCIONES } from '../../../core/models/portal-origen.model';
import { ProcesoWizardStore } from '../services/proceso-wizard.store';
import { ApiErrorBody } from '../../../core/models/auth.model';
import { HttpErrorResponse } from '@angular/common/http';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { formatParametroValor, indicadorValorHint } from '../../../core/utils/parametro.util';
import { esDecimalEnEdicion, parseDecimalInput } from '../../../core/utils/decimal-input.util';
import { mensajeExitoApi } from '../../../core/utils/api-error.util';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { confirmarCreacion, confirmarGuardado } from '../../../core/utils/confirm-dialog.util';

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
  private readonly contactos = inject(ContactosService);
  private readonly procesos = inject(ProcesosService);
  private readonly parametros = inject(ParametrosService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly store = inject(ProcesoWizardStore);

  protected readonly segmentos = signal<CatalogoPaisItem[]>([]);
  protected readonly portalesOrigen = PORTAL_ORIGEN_OPCIONES;
  protected readonly portalOtro = PortalOrigen.Otro;
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);
  protected readonly indicadores = signal<CatalogoPaisItem[]>([]);
  protected readonly etiquetaGeoNivel1 = signal('Departamento');
  protected readonly etiquetaGeoNivel2 = signal('Municipio');
  protected readonly anioActual = new Date().getFullYear();
  protected readonly formatReferencia = formatParametroValor;
  protected readonly valorHint = indicadorValorHint;

  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly municipioOptions = computed(() =>
    this.municipios().map((m) => ({ value: m.id, label: m.municipio })),
  );
  protected readonly clientes = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly contactosCliente = signal<Contacto[]>([]);
  protected readonly contactosLoading = signal(false);
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
    this.catalogos.getCapabilitiesSesion().subscribe({
      next: (r) => {
        this.etiquetaGeoNivel1.set(r.data.etiquetasGeo.nivel1);
        this.etiquetaGeoNivel2.set(r.data.etiquetasGeo.nivel2);
      },
    });
    this.catalogos.getCatalogoSesion('segmento_proceso').subscribe((r) => {
      this.segmentos.set(r.data);
      if (r.data.length) {
        this.store.setSegmentoDefault(r.data[0].codigo);
      }
    });
    this.catalogos.getCatalogoSesion('indicador').subscribe((r) => {
      this.indicadores.set(r.data);
      this.store.syncIndicadores(r.data.map((item) => item.codigo));
    });
    this.loadReferencias();
  }

  protected onDepartamentoChange(departamento: string): void {
    this.store.paso1.update((p) => ({ ...p, departamento, ubicacionId: null }));
    if (!departamento) {
      this.municipios.set([]);
      return;
    }
    this.catalogos.getMunicipios(departamento).subscribe({
      next: (r) =>
        this.municipios.set(
          r.data.map((u) => ({ id: u.id, municipio: u.municipioProvincia })),
        ),
      error: () => {
        this.municipios.set([]);
        this.error.set('No fue posible cargar los municipios del departamento.');
      },
    });
  }

  protected updatePaso1(field: string, value: unknown): void {
    this.store.paso1.update((p) => ({ ...p, [field]: value }));

    if (field === 'empresaClienteId') {
      const clienteId = value ? Number(value) : null;
      this.store.paso1.update((p) => ({ ...p, contactoIds: [] }));
      this.loadContactosCliente(clienteId);
    }

    if (field === 'usarOtro' && value) {
      this.store.paso1.update((p) => ({ ...p, contactoIds: [], empresaClienteId: null }));
      this.contactosCliente.set([]);
    }
  }

  protected toggleContacto(contactoId: number, checked: boolean): void {
    this.store.paso1.update((p) => {
      const current = new Set(p.contactoIds);
      if (checked) {
        current.add(contactoId);
      } else {
        current.delete(contactoId);
      }
      return { ...p, contactoIds: [...current] };
    });
  }

  protected isContactoSelected(contactoId: number): boolean {
    return this.store.paso1().contactoIds.includes(contactoId);
  }

  private loadContactosCliente(clienteId: number | null): void {
    if (!clienteId) {
      this.contactosCliente.set([]);
      return;
    }

    this.contactosLoading.set(true);
    this.contactos.listByCliente(clienteId).subscribe({
      next: (response) => {
        this.contactosCliente.set(response.data);
        this.contactosLoading.set(false);
      },
      error: () => {
        this.contactosCliente.set([]);
        this.contactosLoading.set(false);
      },
    });
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
      } else if (!p1.contactoIds.length) {
        faltantes.push('al menos un contacto del cliente');
      }
      if (!p1.ubicacionId) faltantes.push('ubicación');
      if (p1.portalOrigen === PortalOrigen.Otro && !p1.portalOrigenOtro.trim()) {
        faltantes.push('especificación del portal de origen');
      }
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

    void confirmarCreacion(this.confirmDialog, '¿Desea crear el proceso con la información ingresada?').then(
      (ok) => {
        if (!ok) return;

        this.loading.set(true);

        this.procesos.create(this.store.toPayload()).subscribe({
          next: (res) => {
            this.loading.set(false);
            this.store.reset();
            this.toast.success(mensajeExitoApi(res, 'Proceso creado correctamente.'));
            void this.router.navigate(['/procesos', res.proceso.id]);
          },
          error: (err: HttpErrorResponse) => {
            this.loading.set(false);
            const body = err.error as ApiErrorBody;
            if (body?.errorCode === 'PROCESO_INDICADORES_VACIOS_SIN_CONFIRMACION') {
              this.showConfirmVacios.set(true);
              return;
            }
            this.error.set(
              (body?.message as string) ?? 'No fue posible crear el proceso. Revise los datos.',
            );
          },
        });
      },
    );
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
