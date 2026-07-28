import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { ContactosService } from '../../../../core/services/contactos.service';
import { Cliente } from '../../../../core/models/crm.model';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-contacto-form',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './contacto-form.component.html',
  styleUrl: './contacto-form.component.scss',
})
export class ContactoFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactos = inject(ContactosService);
  private readonly clientes = inject(ClientesService);
  private readonly catalogos = inject(CatalogosService);

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

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = signal(false);

  private contactoId = 0;

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
    this.catalogos.getMunicipios(value).subscribe((r) =>
      this.municipios.set(
        r.data.map((u) => ({ id: u.id, municipio: u.municipioProvincia })),
      ),
    );
  }

  protected guardar(): void {
    const clienteId = this.clienteId();
    const ubicacionId = this.ubicacionId();
    if (!this.nombre().trim() || !clienteId || !ubicacionId) {
      this.error.set('Complete nombre, cliente y ubicación.');
      return;
    }

    const payload = {
      nombre: this.nombre().trim(),
      ubicacionId,
      cargo: this.cargo().trim() || undefined,
      telefono: this.telefono().trim() || undefined,
      correo: this.correo().trim() || undefined,
    };

    this.loading.set(true);
    const req = this.isEdit()
      ? this.contactos.update(this.contactoId, payload)
      : this.contactos.create(clienteId, payload);

    req.subscribe({
      next: () => void this.router.navigate(['/crm/contactos']),
      error: () => {
        this.error.set('No fue posible guardar el contacto.');
        this.loading.set(false);
      },
    });
  }
}
