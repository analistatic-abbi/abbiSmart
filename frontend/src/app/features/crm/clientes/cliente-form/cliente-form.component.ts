import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { CatalogoPaisItem } from '../../../../core/models/pais-config.model';
import {
  DuplicadoAlertaComponent,
  DuplicadoSugerencia,
} from '../../../../shared/components/duplicado-alerta/duplicado-alerta.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarCreacion, confirmarGuardado } from '../../../../core/utils/confirm-dialog.util';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [FormsModule, RouterLink, DuplicadoAlertaComponent, SearchableSelectComponent],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss',
})
export class ClienteFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientes = inject(ClientesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly segmentos = signal<CatalogoPaisItem[]>([]);
  protected readonly segmentoOtro = 'Otro';
  protected readonly etiquetaGeoNivel1 = signal('Departamento');
  protected readonly etiquetaGeoNivel2 = signal('Municipio');

  protected readonly empresa = signal('');
  protected readonly segmento = signal('');
  protected readonly segmentoOtroValor = signal('');
  protected readonly departamento = signal('');
  protected readonly ubicacionId = signal<number | null>(null);

  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly municipioOptions = computed(() =>
    this.municipios().map((m) => ({ value: m.id, label: m.municipio })),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = signal(false);
  protected readonly duplicados = signal<DuplicadoSugerencia[]>([]);
  protected readonly mostrarDuplicados = signal(true);

  private clienteId = 0;
  private similaresTimer: ReturnType<typeof setTimeout> | null = null;

  protected onEmpresaChange(value: string): void {
    this.empresa.set(value);
    this.buscarDuplicados(value);
  }

  protected onEmpresaBlur(): void {
    this.buscarDuplicados(this.empresa(), true);
  }

  private buscarDuplicados(value: string, immediate = false): void {
    if (this.similaresTimer) {
      clearTimeout(this.similaresTimer);
      this.similaresTimer = null;
    }

    const term = value.trim();
    if (term.length < 3) {
      this.duplicados.set([]);
      return;
    }

    const run = () => {
      this.clientes.buscarSimilares(term).subscribe({
        next: (r) => {
          const filtered = r.data.filter((item) => item.id !== this.clienteId);
          this.duplicados.set(filtered);
          if (filtered.length > 0) {
            this.mostrarDuplicados.set(true);
          }
        },
        error: () => this.duplicados.set([]),
      });
    };

    if (immediate) {
      run();
      return;
    }

    this.similaresTimer = setTimeout(run, 400);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.catalogos.getDepartamentos().subscribe((r) => this.departamentos.set(r.data));
    this.catalogos.getCapabilitiesSesion().subscribe({
      next: (r) => {
        this.etiquetaGeoNivel1.set(r.data.etiquetasGeo.nivel1);
        this.etiquetaGeoNivel2.set(r.data.etiquetasGeo.nivel2);
      },
    });
    this.catalogos.getCatalogoSesion('segmento_cliente').subscribe({
      next: (r) => {
        this.segmentos.set(r.data);
        if (!this.isEdit() && r.data.length) {
          this.segmento.set(r.data[0].codigo);
        }
      },
    });

    if (idParam) {
      this.isEdit.set(true);
      this.clienteId = Number(idParam);
      this.clientes.getById(this.clienteId).subscribe({
        next: (r) => {
          const c = r.cliente;
          this.empresa.set(c.empresa);
          this.segmento.set(c.segmento);
          this.segmentoOtroValor.set(c.segmentoOtro ?? '');
          this.ubicacionId.set(c.ubicacionId);
        },
        error: () => this.error.set('No fue posible cargar el cliente.'),
      });
    }
  }

  protected onDepartamentoChange(value: string): void {
    this.departamento.set(value);
    this.ubicacionId.set(null);
    if (!value) {
      this.municipios.set([]);
      return;
    }
    this.catalogos.getMunicipios(value).subscribe({
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

  protected guardar(): void {
    this.error.set(null);

    const ubicacionId = this.ubicacionId();
    if (!this.empresa().trim() || !ubicacionId) {
      this.error.set('Complete empresa y ubicación.');
      return;
    }

    if (this.segmento() === this.segmentoOtro && !this.segmentoOtroValor().trim()) {
      this.error.set('Indique el segmento cuando selecciona «Otro».');
      return;
    }

    this.buscarDuplicados(this.empresa(), true);

    const payload = {
      empresa: this.empresa().trim(),
      ubicacionId,
      segmento: this.segmento(),
      ...(this.segmento() === this.segmentoOtro
        ? { segmentoOtro: this.segmentoOtroValor().trim() }
        : {}),
    };

    const confirm = this.isEdit()
      ? confirmarGuardado(this.confirmDialog, '¿Desea guardar los cambios del cliente?')
      : confirmarCreacion(this.confirmDialog, '¿Desea crear el cliente?');

    void confirm.then((ok) => {
      if (!ok) return;

      this.loading.set(true);
      const req = this.isEdit()
        ? this.clientes.update(this.clienteId, payload)
        : this.clientes.create(payload);

      req.subscribe({
        next: (r) => {
          this.toast.success(
            mensajeExitoApi(
              r,
              this.isEdit() ? 'Cliente actualizado correctamente.' : 'Cliente creado correctamente.',
            ),
          );
          void this.router.navigate(['/crm/clientes', r.cliente.id]);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible guardar el cliente.'));
          this.loading.set(false);
        },
      });
    });
  }
}
