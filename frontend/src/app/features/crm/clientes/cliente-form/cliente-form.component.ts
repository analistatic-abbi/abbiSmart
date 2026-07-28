import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { SegmentoCliente } from '../../../../core/models/crm.model';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss',
})
export class ClienteFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientes = inject(ClientesService);
  private readonly catalogos = inject(CatalogosService);

  protected readonly segmentos = Object.values(SegmentoCliente);
  protected readonly segmentoOtro = SegmentoCliente.Otro;

  protected readonly empresa = signal('');
  protected readonly segmento = signal<SegmentoCliente>(SegmentoCliente.Mineria);
  protected readonly segmentoOtroValor = signal('');
  protected readonly departamento = signal('');
  protected readonly ubicacionId = signal<number | null>(null);

  protected readonly departamentos = signal<string[]>([]);
  protected readonly municipios = signal<Array<{ id: number; municipio: string }>>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = signal(false);

  private clienteId = 0;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.catalogos.getDepartamentos().subscribe((r) => this.departamentos.set(r.data));

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
    this.catalogos.getMunicipios(value).subscribe((r) =>
      this.municipios.set(
        r.data.map((u) => ({ id: u.id, municipio: u.municipioProvincia })),
      ),
    );
  }

  protected guardar(): void {
    const ubicacionId = this.ubicacionId();
    if (!this.empresa().trim() || !ubicacionId) {
      this.error.set('Complete empresa y ubicación.');
      return;
    }

    const payload = {
      empresa: this.empresa().trim(),
      ubicacionId,
      segmento: this.segmento(),
      ...(this.segmento() === SegmentoCliente.Otro
        ? { segmentoOtro: this.segmentoOtroValor().trim() }
        : {}),
    };

    this.loading.set(true);
    const req = this.isEdit()
      ? this.clientes.update(this.clienteId, payload)
      : this.clientes.create(payload);

    req.subscribe({
      next: (r) => {
        void this.router.navigate(['/crm/clientes', r.cliente.id]);
      },
      error: () => {
        this.error.set('No fue posible guardar el cliente.');
        this.loading.set(false);
      },
    });
  }
}
