import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { KamCalendarioEvento } from '../../../core/models/kam.model';
import { formatFechaCorta, parseIsoDateLocal } from '../../../core/utils/date.util';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';
import { ThemeService } from '../../../core/services/theme.service';
import { KamVistaToggleComponent } from '../kam-vista-toggle/kam-vista-toggle.component';
import { YearSelectorComponent } from '../../../shared/components/year-selector/year-selector.component';
import {
  claseUrgenciaDias,
  getEstadoKamCalendarioStyle,
  labelDiasRestantes,
} from '../estado-kam-calendario.styles';

interface MesCalendario {
  mesIndex: number;
  nombre: string;
  items: KamCalendarioEvento[];
}

@Component({
  selector: 'app-kam-calendario',
  standalone: true,
  imports: [RouterLink, KamVistaToggleComponent, YearSelectorComponent],
  templateUrl: './kam-calendario.component.html',
  styleUrl: './kam-calendario.component.scss',
})
export class KamCalendarioComponent implements OnInit {
  private readonly kamService = inject(KamService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly items = signal<KamCalendarioEvento[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly formatFechaCorta = formatFechaCorta;
  protected readonly labelDiasRestantes = labelDiasRestantes;
  protected readonly claseUrgenciaDias = claseUrgenciaDias;

  protected readonly totalEventos = computed(() => this.items().length);

  protected readonly meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  protected readonly mesesAgrupados = computed<MesCalendario[]>(() => {
    const anio = this.anio();
    const buckets: KamCalendarioEvento[][] = Array.from({ length: 12 }, () => []);

    for (const evento of this.items()) {
      const fecha = parseIsoDateLocal(evento.fecha);
      if (Number.isNaN(fecha.getTime()) || fecha.getFullYear() !== anio) continue;
      buckets[fecha.getMonth()].push(evento);
    }

    return this.meses.map((nombre, mesIndex) => ({
      mesIndex,
      nombre,
      items: buckets[mesIndex].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }));
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

  protected navigateToDetail(kamId: number): void {
    void this.router.navigate(['/kam', Number(kamId)]);
  }

  protected estadoStyle(estado: string) {
    this.themeService.theme();
    return getEstadoKamCalendarioStyle(estado);
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

  protected recargar(): void {
    this.load();
  }

  protected dias(evento: KamCalendarioEvento): number {
    return Number(evento.diasRestantes ?? 0);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.kamService.getCalendario(this.anio()).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.items.set([]);
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar el calendario KAM.'));
        this.loading.set(false);
      },
    });
  }
}
