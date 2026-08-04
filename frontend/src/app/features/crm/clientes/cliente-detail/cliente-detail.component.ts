import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { ContactosService } from '../../../../core/services/contactos.service';
import { SolicitudesEliminacionService } from '../../../../core/services/solicitudes-eliminacion.service';
import {
  ClienteVista360,
  Contacto,
} from '../../../../core/models/crm.model';
import { Rol } from '../../../../core/models/rol.enum';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ClienteHistorialComponent } from '../cliente-historial/cliente-historial.component';
import { formatCurrencyFull, formatCuantiaConMoneda } from '../../../../core/utils/currency.util';

type ClienteTab = 'resumen' | 'procesos' | 'proyecciones' | 'relacionamientos' | 'contactos' | 'historial';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent, ClienteHistorialComponent],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss',
})
export class ClienteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientes = inject(ClientesService);
  private readonly contactos = inject(ContactosService);
  private readonly solicitudes = inject(SolicitudesEliminacionService);
  private readonly auth = inject(AuthService);

  protected readonly vista360 = signal<ClienteVista360 | null>(null);
  protected readonly contactosList = signal<Contacto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<ClienteTab>('resumen');

  protected readonly showEliminarModal = signal(false);
  protected readonly dependencias = signal<Array<{ descripcion: string }>>([]);
  protected readonly confirmarDependientes = signal(false);
  protected readonly motivoEliminacion = signal('');

  protected readonly showReasignarModal = signal(false);
  protected readonly clientesDestino = signal<Array<{ id: number; empresa: string }>>([]);
  protected readonly clientesDestinoOptions = computed(() =>
    this.clientesDestino().map((cliente) => ({
      value: cliente.id,
      label: cliente.empresa,
    })),
  );
  protected readonly nuevoClienteId = signal<number | null>(null);

  protected readonly puedeEliminarDirecto = computed(() => this.auth.rol() === Rol.Administrador);
  protected readonly puedeReasignar = computed(() => this.auth.rol() === Rol.Administrador);
  protected readonly puedeEscribir = computed(() => this.auth.puedeEscribir());
  protected readonly puedeSolicitarEliminacion = computed(() => {
    const rol = this.auth.rol();
    return rol === Rol.Operador || rol === Rol.SupervisorSistema;
  });

  protected readonly cliente = computed(() => this.vista360()?.cliente ?? null);
  protected readonly ubicacionLabel = computed(() => this.vista360()?.ubicacionLabel ?? null);
  protected readonly resumen = computed(() => this.vista360()?.resumen ?? null);
  protected readonly procesos = computed(() => this.vista360()?.procesos ?? []);
  protected readonly proyecciones = computed(() => this.vista360()?.proyecciones ?? []);
  protected readonly relacionamientos = computed(() => this.vista360()?.relacionamientos ?? []);

  protected readonly formatCuantia = formatCuantiaConMoneda;
  protected readonly formatCurrency = formatCurrencyFull;

  protected readonly cuantiaResumenLabel = computed(() => {
    const resumen = this.resumen();
    const procesosActivos = this.procesos().filter(
      (p) => p.estado !== 'Cerrado' && p.estado !== 'Descartado',
    );
    if (!resumen || procesosActivos.length === 0) {
      return '—';
    }
    const moneda = procesosActivos[0]?.moneda;
    return formatCuantiaConMoneda(resumen.cuantiaTotal, moneda);
  });

  private clienteId = 0;

  ngOnInit(): void {
    this.clienteId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  protected setTab(next: ClienteTab): void {
    this.tab.set(next);
  }

  protected abrirEliminar(): void {
    this.motivoEliminacion.set('');
    this.confirmarDependientes.set(false);
    if (this.puedeEliminarDirecto()) {
      this.clientes.getDependencias(this.clienteId).subscribe({
        next: (r) => {
          this.dependencias.set(r.data.dependientes);
          this.showEliminarModal.set(true);
        },
        error: () => this.error.set('No fue posible consultar dependencias.'),
      });
      return;
    }
    this.showEliminarModal.set(true);
  }

  protected confirmarEliminacion(): void {
    if (this.puedeEliminarDirecto()) {
      this.clientes.eliminar(this.clienteId, this.confirmarDependientes()).subscribe({
        next: () => void this.router.navigate(['/crm/clientes']),
        error: () => this.error.set('No fue posible eliminar el cliente.'),
      });
      return;
    }

    const motivo = this.motivoEliminacion().trim();
    if (motivo.length < 5) return;

    this.solicitudes.solicitar('cliente', this.clienteId, motivo).subscribe({
      next: () => this.showEliminarModal.set(false),
      error: () => this.error.set('No fue posible registrar la solicitud.'),
    });
  }

  protected abrirReasignar(): void {
    this.clientes.list({ limit: 200 }).subscribe({
      next: (r) => {
        this.clientesDestino.set(
          r.data.filter((c) => c.id !== this.clienteId).map((c) => ({ id: c.id, empresa: c.empresa })),
        );
        this.nuevoClienteId.set(null);
        this.showReasignarModal.set(true);
      },
    });
  }

  protected confirmarReasignacion(): void {
    const destinoId = this.nuevoClienteId();
    if (!destinoId) return;

    this.clientes.reasignarProcesos(this.clienteId, destinoId).subscribe({
      next: () => this.showReasignarModal.set(false),
      error: () => this.error.set('No fue posible reasignar los procesos.'),
    });
  }

  private load(): void {
    this.clientes.getVista360(this.clienteId).subscribe({
      next: (r) => {
        this.vista360.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar el cliente.');
        this.loading.set(false);
      },
    });

    this.contactos.listByCliente(this.clienteId).subscribe({
      next: (r) => this.contactosList.set(r.data),
      error: () => this.contactosList.set([]),
    });
  }
}
