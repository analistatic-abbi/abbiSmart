import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EstadoProyeccion, MercadoProyeccion, Proyeccion } from '../../../../core/models/admin.model';
import {
  FILTRO_ELIMINADOS_OPCIONES,
  FiltroEliminados,
} from '../../../../core/models/filtro-eliminados.model';
import { claseBadgeEstadoProyeccion } from '../../../../core/utils/proyeccion-ui.util';
import {
  formatMonedaAbreviada,
  tituloMonedaCompleta,
} from '../../../../core/utils/currency.util';
import { ProyeccionesVistaToggleComponent } from '../proyecciones-vista-toggle/proyecciones-vista-toggle.component';

@Component({
  selector: 'app-proyecciones-list',
  standalone: true,
  imports: [FormsModule, RouterLink, ProyeccionesVistaToggleComponent],
  templateUrl: './proyecciones-list.component.html',
  styleUrl: './proyecciones-list.component.scss',
})
export class ProyeccionesListComponent implements OnInit {
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly items = signal<Proyeccion[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly estados = Object.values(EstadoProyeccion);
  protected readonly mercados = Object.values(MercadoProyeccion);
  protected readonly estado = signal<EstadoProyeccion | ''>('');
  protected readonly mercado = signal('');
  protected readonly anio = signal<number | null>(null);

  protected readonly puedeAsignarMercado = () => this.auth.puedeAsignarMercadoProyeccion();
  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly puedeVerEliminados = () => this.auth.puedeVerEliminados();
  protected readonly filtrosEliminados = FILTRO_ELIMINADOS_OPCIONES;
  protected readonly filtroEliminados = signal<FiltroEliminados>('activos');
  protected readonly formatValor = formatMonedaAbreviada;
  protected readonly tituloValor = tituloMonedaCompleta;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoProyeccion(estado);

  ngOnInit(): void {
    this.syncAnioFromRoute();
    this.load();

    this.route.queryParamMap.subscribe((params) => {
      const anioParam = params.get('anio');
      const parsed = anioParam ? Number(anioParam) : null;
      const nextAnio = parsed !== null && !Number.isNaN(parsed) ? parsed : null;

      if (nextAnio !== this.anio()) {
        this.anio.set(nextAnio);
        this.load();
      }
    });
  }

  protected onFilter(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { anio: this.anio() ?? null },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  protected estadoClass(estado: string): string {
    return claseBadgeEstadoProyeccion(estado);
  }

  private load(): void {
    this.loading.set(true);
    this.proyecciones
      .list({
        search: this.search() || undefined,
        estado: this.estado() || undefined,
        mercado: this.mercado() || undefined,
        anioProyectado: this.anio() ?? undefined,
        filtroEliminados: this.filtroEliminados(),
        limit: 500,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.loading.set(false);
        },
      });
  }

  private syncAnioFromRoute(): void {
    const anioParam = this.route.snapshot.queryParamMap.get('anio');
    if (!anioParam) {
      this.anio.set(null);
      return;
    }

    const parsed = Number(anioParam);
    this.anio.set(!Number.isNaN(parsed) ? parsed : null);
  }
}
