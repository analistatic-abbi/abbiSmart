import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcesosService } from '../../../core/services/procesos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  EstadoProceso,
  ProcesoListItem,
  SegmentoProceso,
  TipoInstrumento,
  TipoProceso,
} from '../../../core/models/proceso.model';

@Component({
  selector: 'app-procesos-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './procesos-list.component.html',
  styleUrl: './procesos-list.component.scss',
})
export class ProcesosListComponent implements OnInit {
  private readonly procesos = inject(ProcesosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly puedeVerEliminados = () => this.auth.puedeVerEliminados();

  protected readonly estados = Object.values(EstadoProceso);
  protected readonly segmentos = Object.values(SegmentoProceso);
  protected readonly tiposProceso = Object.values(TipoProceso);
  protected readonly tiposInstrumento = Object.values(TipoInstrumento);

  protected readonly items = signal<ProcesoListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly estado = signal<EstadoProceso | ''>('');
  protected readonly segmento = signal<SegmentoProceso | ''>('');
  protected readonly tipoProceso = signal<TipoProceso | ''>('');
  protected readonly tipoInstrumento = signal<TipoInstrumento | ''>('');
  protected readonly incluirEliminados = signal(false);
  protected readonly total = signal(0);
  protected readonly exportando = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected readonly tieneFiltrosActivos = computed(
    () =>
      !!this.search().trim() ||
      !!this.estado() ||
      !!this.segmento() ||
      !!this.tipoProceso() ||
      !!this.tipoInstrumento() ||
      this.incluirEliminados(),
  );

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected limpiarFiltros(): void {
    this.search.set('');
    this.estado.set('');
    this.segmento.set('');
    this.tipoProceso.set('');
    this.tipoInstrumento.set('');
    this.incluirEliminados.set(false);
    this.load();
  }

  protected exportar(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.procesos.exportar(this.buildParams(), (message) => {
      this.exportError.set(message);
      this.exportando.set(false);
    });
    setTimeout(() => this.exportando.set(false), 1500);
  }

  private load(): void {
    this.loading.set(true);
    this.procesos.list(this.buildParams()).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.total.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  private buildParams() {
    return {
      page: 1,
      limit: 50,
      search: this.search().trim() || undefined,
      estado: this.estado() || undefined,
      segmento: this.segmento() || undefined,
      tipoProceso: this.tipoProceso() || undefined,
      tipoInstrumento: this.tipoInstrumento() || undefined,
      incluirEliminados: this.incluirEliminados() || undefined,
    };
  }
}
