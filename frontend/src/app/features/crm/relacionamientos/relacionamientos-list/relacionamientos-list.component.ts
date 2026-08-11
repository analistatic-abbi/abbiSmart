import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import { ContactosService } from '../../../../core/services/contactos.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CanalRelacionamiento,
  Relacionamiento,
  RelacionamientoVencido,
  ResultadoRelacionamiento,
} from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';
import { formatFechaHora } from '../../../../core/utils/date.util';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';

type Vista = 'todos' | 'vencidos';

@Component({
  selector: 'app-relacionamientos-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CrmTabsComponent],
  templateUrl: './relacionamientos-list.component.html',
  styleUrl: './relacionamientos-list.component.scss',
})
export class RelacionamientosListComponent implements OnInit {
  private readonly relacionamientos = inject(RelacionamientosService);
  private readonly contactos = inject(ContactosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<Relacionamiento[]>([]);
  protected readonly vencidos = signal<RelacionamientoVencido[]>([]);
  protected readonly contactoMap = signal<Record<number, string>>({});
  protected readonly loading = signal(true);
  protected readonly vista = signal<Vista>('todos');
  protected readonly search = signal('');
  protected readonly canales = Object.values(CanalRelacionamiento);
  protected readonly resultados = Object.values(ResultadoRelacionamiento);
  protected readonly canal = signal<CanalRelacionamiento | ''>('');
  protected readonly resultado = signal<ResultadoRelacionamiento | ''>('');
  protected readonly fechaMensajeDesde = signal('');
  protected readonly fechaMensajeHasta = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly formatFecha = formatFechaHora;

  protected readonly tieneFiltrosActivos = computed(
    () =>
      Boolean(this.search().trim()) ||
      Boolean(this.canal()) ||
      Boolean(this.resultado()) ||
      Boolean(this.fechaMensajeDesde()) ||
      Boolean(this.fechaMensajeHasta()),
  );

  protected readonly vencidosFiltrados = computed(() => {
    const desde = this.fechaMensajeDesde();
    const hasta = this.fechaMensajeHasta();
    let items = this.vencidos();

    if (desde) {
      items = items.filter((item) => item.fechaLimiteRespuesta >= desde);
    }
    if (hasta) {
      items = items.filter((item) => item.fechaLimiteRespuesta <= hasta);
    }

    return items;
  });

  ngOnInit(): void {
    this.contactos.list({ limit: 500 }).subscribe({
      next: (r) => {
        const map: Record<number, string> = {};
        for (const c of r.data) {
          map[c.id] = c.nombre;
        }
        this.contactoMap.set(map);
      },
    });
    this.load();
  }

  protected contactoLabel(id: number): string {
    return this.contactoMap()[id] ?? `#${id}`;
  }

  protected setVista(vista: Vista): void {
    this.vista.set(vista);
    this.load();
  }

  protected onFilter(): void {
    if (!this.validarRangoFechas()) return;
    if (this.vista() === 'vencidos') return;
    this.load();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.canal.set('');
    this.resultado.set('');
    this.fechaMensajeDesde.set('');
    this.fechaMensajeHasta.set('');
    this.error.set(null);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    if (this.vista() === 'vencidos') {
      this.relacionamientos.listVencidos().subscribe({
        next: (r) => {
          this.vencidos.set(r.data);
          this.loading.set(false);
        },
        error: () => {
          this.vencidos.set([]);
          this.loading.set(false);
        },
      });
      return;
    }

    this.relacionamientos
      .list({
        search: this.search() || undefined,
        canal: this.canal() || undefined,
        resultado: this.resultado() || undefined,
        fechaMensajeDesde: this.fechaMensajeDesde() || undefined,
        fechaMensajeHasta: this.fechaMensajeHasta() || undefined,
        limit: 500,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.items.set([]);
          this.total.set(0);
          this.error.set(mensajeErrorApi(err, 'No fue posible cargar los relacionamientos.'));
          this.loading.set(false);
        },
      });
  }

  private validarRangoFechas(): boolean {
    if (
      this.fechaMensajeDesde() &&
      this.fechaMensajeHasta() &&
      this.fechaMensajeDesde() > this.fechaMensajeHasta()
    ) {
      this.error.set('La fecha desde no puede ser posterior a la fecha hasta.');
      return false;
    }

    this.error.set(null);
    return true;
  }
}
