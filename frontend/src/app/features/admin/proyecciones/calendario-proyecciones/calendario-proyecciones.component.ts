import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Proyeccion } from '../../../../core/models/admin.model';
import { formatCurrencyAbbreviated } from '../../../../core/utils/currency.util';
import { parseIsoDateLocal } from '../../../../core/utils/date.util';
import { getEstadoCalendarioStyle } from './estado-calendario.styles';
import { ProyeccionesVistaToggleComponent } from '../proyecciones-vista-toggle/proyecciones-vista-toggle.component';
import { YearSelectorComponent } from '../../../../shared/components/year-selector/year-selector.component';
import { ThemeService } from '../../../../core/services/theme.service';

interface MesCalendario {
  mesIndex: number;
  nombre: string;
  items: Proyeccion[];
}

@Component({
  selector: 'app-calendario-proyecciones',
  standalone: true,
  imports: [RouterLink, ProyeccionesVistaToggleComponent, YearSelectorComponent],
  templateUrl: './calendario-proyecciones.component.html',
  styleUrl: './calendario-proyecciones.component.scss',
})
export class CalendarioProyeccionesComponent implements OnInit {
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly items = signal<Proyeccion[]>([]);
  protected readonly loading = signal(true);
  protected readonly anio = signal(new Date().getFullYear());

  protected readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  protected readonly mesesAgrupados = computed<MesCalendario[]>(() => {
    const anio = this.anio();
    const buckets: Proyeccion[][] = Array.from({ length: 12 }, () => []);

    for (const p of this.items()) {
      const fecha = parseIsoDateLocal(p.fechaEstimadaPublicacion);
      if (fecha.getFullYear() !== anio) continue;
      buckets[fecha.getMonth()].push(p);
    }

    return this.meses.map((nombre, mesIndex) => ({
      mesIndex,
      nombre,
      items: buckets[mesIndex].sort((a, b) =>
        a.fechaEstimadaPublicacion.localeCompare(b.fechaEstimadaPublicacion),
      ),
    }));
  });

  protected readonly puedeAsignarMercado = () => this.auth.puedeAsignarMercadoProyeccion();
  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly formatValor = formatCurrencyAbbreviated;
  protected estadoStyle(estado: string) {
    this.themeService.theme();
    return getEstadoCalendarioStyle(estado);
  }

  ngOnInit(): void {
    this.syncAnioFromRoute();
    this.load();

    this.route.queryParamMap.subscribe((params) => {
      const anioParam = params.get('anio');
      if (!anioParam) return;

      const parsed = Number(anioParam);
      if (!Number.isNaN(parsed) && parsed !== this.anio()) {
        this.anio.set(parsed);
        this.load();
      }
    });
  }

  protected anioAnterior(): void {
    this.setAnio(this.anio() - 1);
  }

  protected anioSiguiente(): void {
    this.setAnio(this.anio() + 1);
  }

  protected empresaLabel(p: Proyeccion): string {
    return p.empresa ?? p.procesoCodigo ?? 'Proyección manual';
  }

  protected navigateToDetail(id: number): void {
    void this.router.navigate(['/proyecciones', id]);
  }

  private setAnio(anio: number): void {
    this.anio.set(anio);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { anio },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  private syncAnioFromRoute(): void {
    const anioParam = this.route.snapshot.queryParamMap.get('anio');
    if (anioParam) {
      const parsed = Number(anioParam);
      if (!Number.isNaN(parsed)) {
        this.anio.set(parsed);
        return;
      }
    }
    this.anio.set(new Date().getFullYear());
  }

  private load(): void {
    this.loading.set(true);
    this.proyecciones
      .list({ anioProyectado: this.anio(), limit: 500 })
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
}
