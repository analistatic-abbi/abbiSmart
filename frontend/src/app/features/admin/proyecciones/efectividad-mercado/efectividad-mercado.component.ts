import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  EfectividadMercadoMercado,
  EfectividadMercadoReporte,
} from '../../../../core/models/admin.model';
import { ProyeccionesService } from '../../../../core/services/proyecciones.service';
import { YearSelectorComponent } from '../../../../shared/components/year-selector/year-selector.component';

interface FilaReporte {
  label: string;
  general: string;
  objetivo: string;
  separador?: boolean;
  nota?: string;
}

@Component({
  selector: 'app-efectividad-mercado',
  standalone: true,
  imports: [RouterLink, YearSelectorComponent],
  templateUrl: './efectividad-mercado.component.html',
  styleUrl: './efectividad-mercado.component.scss',
})
export class EfectividadMercadoComponent implements OnInit {
  private readonly proyecciones = inject(ProyeccionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly reporte = signal<EfectividadMercadoReporte | null>(null);
  protected readonly anio = signal(new Date().getFullYear() - 1);

  protected readonly filas = computed<FilaReporte[]>(() => {
    const data = this.reporte();
    if (!data) return [];

    return [
      {
        label: 'Total de proyecciones',
        general: this.formatNumero(data.general.total),
        objetivo: this.formatNumero(data.objetivo.total),
      },
      {
        label: '% Nunca se materializó',
        general: this.formatPct(data.general.pctNuncaMaterializadas),
        objetivo: this.formatPct(data.objetivo.pctNuncaMaterializadas),
        nota: 'Sobre proyecciones resueltas',
      },
      {
        label: '% Se materializó, no se ganó',
        general: this.formatPct(data.general.pctMaterializadasNoGanadas),
        objetivo: this.formatPct(data.objetivo.pctMaterializadasNoGanadas),
        nota: 'Sobre proyecciones resueltas',
      },
      {
        label: '% Se ganó',
        general: this.formatPct(data.general.pctGanadas),
        objetivo: this.formatPct(data.objetivo.pctGanadas),
        nota: 'Sobre proyecciones resueltas',
      },
      {
        label: '% Ganadas, de las materializadas',
        general: this.formatPct(data.general.pctGanadasDeMaterializadas),
        objetivo: this.formatPct(data.objetivo.pctGanadasDeMaterializadas),
        separador: true,
        nota: 'Sobre proyecciones que sí se materializaron',
      },
    ];
  });

  protected readonly pendientesTotales = computed(() => {
    const data = this.reporte();
    if (!data) return 0;
    return data.general.pendientes + data.objetivo.pendientes;
  });

  protected readonly sinDatos = computed(() => {
    const data = this.reporte();
    if (!data) return false;
    return data.general.total === 0 && data.objetivo.total === 0;
  });

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

  protected barWidth(mercado: EfectividadMercadoMercado): number {
    return mercado.pctGanadasDeMaterializadas ?? 0;
  }

  protected formatPct(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)}%`;
  }

  private formatNumero(value: number): string {
    return String(value);
  }

  private setAnio(value: number): void {
    this.anio.set(value);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { anio: value },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  private syncAnioFromRoute(): void {
    const anioParam = this.route.snapshot.queryParamMap.get('anio');
    if (!anioParam) return;

    const parsed = Number(anioParam);
    if (!Number.isNaN(parsed)) {
      this.anio.set(parsed);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.proyecciones.getEfectividadMercado(this.anio()).subscribe({
      next: (r) => {
        this.reporte.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.reporte.set(null);
        this.error.set('No fue posible cargar el reporte de efectividad.');
        this.loading.set(false);
      },
    });
  }
}
