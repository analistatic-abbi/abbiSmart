import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { ContactosService } from '../../../../core/services/contactos.service';
import { Cliente } from '../../../../core/models/crm.model';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import {
  DuplicadoAlertaComponent,
  DuplicadoSugerencia,
} from '../../../../shared/components/duplicado-alerta/duplicado-alerta.component';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarCreacion, confirmarGuardado } from '../../../../core/utils/confirm-dialog.util';

@Component({
  selector: 'app-contacto-form',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent, DuplicadoAlertaComponent],
  templateUrl: './contacto-form.component.html',
  styleUrl: './contacto-form.component.scss',
})
export class ContactoFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactos = inject(ContactosService);
  private readonly clientes = inject(ClientesService);
  private readonly catalogos = inject(CatalogosService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly nombre = signal('');
  protected readonly cargo = signal('');
  protected readonly telefono = signal('');
  protected readonly correo = signal('');
  protected readonly clienteId = signal<number | null>(null);
  protected readonly departamento = signal('');
  protected readonly ubicacionId = signal<number | null>(null);

  protected readonly clientesList = signal<Cliente[]>([]);
  protected readonly clienteOptions = computed(() =>
    this.clientesList().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );
  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly municipioOptions = computed(() =>
    this.municipios().map((m) => ({ value: m.id, label: m.municipio })),
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = signal(false);
  protected readonly referidoPorNombre = signal<string | null>(null);
  protected readonly esReferido = signal(false);
  protected readonly duplicados = signal<DuplicadoSugerencia[]>([]);
  protected readonly mostrarDuplicados = signal(true);

  private contactoId = 0;
  private similaresTimer: ReturnType<typeof setTimeout> | null = null;

  protected onNombreChange(value: string): void {
    this.nombre.set(value);
    this.buscarDuplicados(value);
  }

  protected onNombreBlur(): void {
    this.buscarDuplicados(this.nombre(), true);
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
      this.contactos.buscarSimilares(term).subscribe({
        next: (r) => {
          const filtered = r.data.filter((item) => item.id !== this.contactoId);
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
    const clienteQuery = this.route.snapshot.queryParamMap.get('clienteId');

    this.catalogos.getDepartamentos().subscribe((r) => this.departamentos.set(r.data));
    this.clientes.list({ limit: 200 }).subscribe((r) => this.clientesList.set(r.data));

    if (clienteQuery) {
      this.clienteId.set(Number(clienteQuery));
    }

    if (idParam) {
      this.isEdit.set(true);
      this.contactoId = Number(idParam);
      this.contactos.getById(this.contactoId).subscribe({
        next: (r) => {
          const c = r.contacto;
          this.nombre.set(c.nombre);
          this.cargo.set(c.cargo ?? '');
          this.telefono.set(c.telefono ?? '');
          this.correo.set(c.correo ?? '');
          this.clienteId.set(c.clienteId);
          this.ubicacionId.set(c.ubicacionId);
          this.esReferido.set(c.esReferido);
          this.referidoPorNombre.set(c.referidoPorNombre);
        },
        error: () => this.error.set('No fue posible cargar el contacto.'),
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

    const clienteId = this.clienteId();
    const ubicacionId = this.ubicacionId();
    if (!this.nombre().trim() || !clienteId || !ubicacionId) {
      this.error.set('Complete nombre, cliente y ubicación.');
      return;
    }

    this.buscarDuplicados(this.nombre(), true);

    const payload = {
      nombre: this.nombre().trim(),
      ubicacionId,
      cargo: this.cargo().trim() || undefined,
      telefono: this.telefono().trim() || undefined,
      correo: this.correo().trim() || undefined,
    };

    const confirm = this.isEdit()
      ? confirmarGuardado(this.confirmDialog, '¿Desea guardar los cambios del contacto?')
      : confirmarCreacion(this.confirmDialog, '¿Desea crear el contacto?');

    void confirm.then((ok) => {
      if (!ok) return;

      this.loading.set(true);
      const req = this.isEdit()
        ? this.contactos.update(this.contactoId, payload)
        : this.contactos.create(clienteId, payload);

      req.subscribe({
        next: (r) => {
          this.toast.success(
            mensajeExitoApi(
              r,
              this.isEdit() ? 'Contacto actualizado correctamente.' : 'Contacto creado correctamente.',
            ),
          );
          void this.router.navigate(['/crm/contactos']);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible guardar el contacto.'));
          this.loading.set(false);
        },
      });
    });
  }
}
