import { LowerCasePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  BandejaItem,
  BandejaPersonalData,
  BandejaPersonalService,
  BandejaResumen,
  BandejaUrgencia,
  FijacionEntidadTipo,
} from '../../core/services/bandeja-personal.service';
import { parseIsoDateLocal } from '../../core/utils/date.util';
import { getEventoCalendarioStyle } from '../calendario/calendario-evento.styles';

interface BandejaUrgenciaGrupo {
  urgencia: BandejaUrgencia;
  label: string;
  items: BandejaItem[];
}

interface BandejaGrupo {
  titulo: string;
  tipo: FijacionEntidadTipo;
  items: BandejaItem[];
  subgrupos: BandejaUrgenciaGrupo[];
}

const URGENCIA_LABELS: Record<BandejaUrgencia, string> = {
  alta: 'Urgente',
  media: 'Próximo',
  baja: 'Planificado',
  sin_fecha: 'Sin fecha',
};

const URGENCIA_ORDER: BandejaUrgencia[] = ['alta', 'media', 'baja', 'sin_fecha'];

@Component({
  selector: 'app-bandeja-personal',
  standalone: true,
  imports: [LowerCasePipe],
  templateUrl: './bandeja-personal.component.html',
  styleUrl: './bandeja-personal.component.scss',
})
export class BandejaPersonalComponent implements OnInit {
  private readonly bandejaService = inject(BandejaPersonalService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<BandejaResumen | null>(null);
  protected readonly grupos = signal<BandejaGrupo[]>([]);

  protected readonly tieneFijados = computed(
    () => (this.resumen()?.totalFijados ?? 0) > 0,
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.bandejaService.getBandeja().subscribe({
      next: (res) => {
        this.resumen.set(res.data.resumen);
        this.grupos.set(this.buildGrupos(res.data));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la bandeja personal.');
        this.loading.set(false);
      },
    });
  }

  protected eventoStyle(tipo: FijacionEntidadTipo, estado: string) {
    return getEventoCalendarioStyle(tipo, estado);
  }

  protected formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const parsed = parseIsoDateLocal(fecha);
    return parsed.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected diasRestantesLabel(item: BandejaItem): string {
    if (item.diasRestantes === null) return 'Sin fecha';
    if (item.diasRestantes < 0) {
      const dias = Math.abs(item.diasRestantes);
      return `Vencido hace ${dias} día${dias === 1 ? '' : 's'}`;
    }
    if (item.diasRestantes === 0) return 'Vence hoy';
    if (item.diasRestantes === 1) return 'Vence mañana';
    return `${item.diasRestantes} días restantes`;
  }

  protected urgenciaLabel(urgencia: BandejaUrgencia | string): string {
    return URGENCIA_LABELS[urgencia as BandejaUrgencia] ?? String(urgencia);
  }

  protected navigateTo(item: BandejaItem): void {
    void this.router.navigateByUrl(item.ruta);
  }

  private buildGrupos(data: BandejaPersonalData): BandejaGrupo[] {
    return [
      {
        titulo: 'Procesos',
        tipo: 'proceso',
        items: data.procesos,
        subgrupos: this.groupByUrgencia(data.procesos),
      },
      {
        titulo: 'Proyecciones',
        tipo: 'proyeccion',
        items: data.proyecciones,
        subgrupos: this.groupByUrgencia(data.proyecciones),
      },
      {
        titulo: 'Relacionamientos',
        tipo: 'relacionamiento',
        items: data.relacionamientos,
        subgrupos: this.groupByUrgencia(data.relacionamientos),
      },
      {
        titulo: 'KAMs',
        tipo: 'kam',
        items: data.kams ?? [],
        subgrupos: this.groupByUrgencia(data.kams ?? []),
      },
    ];
  }

  private groupByUrgencia(items: BandejaItem[]): BandejaUrgenciaGrupo[] {
    return URGENCIA_ORDER.map((urgencia) => ({
      urgencia,
      label: URGENCIA_LABELS[urgencia],
      items: items.filter((item) => item.urgencia === urgencia),
    })).filter((grupo) => grupo.items.length > 0);
  }
}
