import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormatosCalificacionService } from '../../../../core/services/formatos-calificacion.service';
import {
  COLUMNAS_FORMATO_CALIFICACION,
  FormatoCalificacionDetail,
  FormatoCalificacionListItem,
  PROMPT_IA_FORMATO_CALIFICACION,
} from '../../../../core/models/formato-calificacion.model';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';
import { formatFechaHora } from '../../../../core/utils/date.util';
import { IndicadorCodigo } from '../../../../core/models/proceso.model';
import { formatRangoIndicador } from '../../../../core/utils/parametro.util';

@Component({
  selector: 'app-formatos-calificacion-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formatos-calificacion-list.component.html',
  styleUrl: './formatos-calificacion-list.component.scss',
})
export class FormatosCalificacionListComponent implements OnInit {
  private readonly formatosService = inject(FormatosCalificacionService);

  protected readonly formatos = signal<FormatoCalificacionListItem[]>([]);
  protected readonly detalle = signal<FormatoCalificacionDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly uploadLoading = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly copiado = signal(false);
  protected readonly menuAbiertoId = signal<number | null>(null);

  @HostListener('document:click')
  protected cerrarMenus(): void {
    this.menuAbiertoId.set(null);
  }

  protected readonly nombre = signal('');
  protected readonly puntajeMinimo = signal<number | null>(null);
  protected readonly archivo = signal<File | null>(null);

  protected readonly columnas = COLUMNAS_FORMATO_CALIFICACION;
  protected readonly promptIa = PROMPT_IA_FORMATO_CALIFICACION;
  protected readonly formatFechaHora = formatFechaHora;

  protected readonly rangosPorIndicador = computed(() => {
    const detalle = this.detalle();
    if (!detalle) return [];

    const map = new Map<string, FormatoCalificacionDetail['rangos']>();
    for (const rango of detalle.rangos) {
      const grupo = map.get(rango.indicadorCodigo) ?? [];
      grupo.push(rango);
      map.set(rango.indicadorCodigo, grupo);
    }

    return [...map.entries()].map(([indicadorCodigo, rangos]) => ({
      indicadorCodigo,
      rangos: [...rangos].sort((a, b) => a.orden - b.orden),
    }));
  });

  ngOnInit(): void {
    this.cargarFormatos();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  protected async copiarPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.promptIa);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = this.promptIa;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    }
  }

  protected subir(): void {
    const file = this.archivo();
    const nombre = this.nombre().trim();
    const puntaje = this.puntajeMinimo();

    if (!nombre || puntaje === null || puntaje < 0 || !file) {
      this.error.set('Complete nombre, puntaje mínimo y archivo.');
      return;
    }

    this.uploadLoading.set(true);
    this.error.set(null);
    this.feedback.set(null);

    this.formatosService.importFormato(nombre, puntaje, file).subscribe({
      next: (res) => {
        this.feedback.set(res.message);
        this.nombre.set('');
        this.puntajeMinimo.set(null);
        this.archivo.set(null);
        this.uploadLoading.set(false);
        this.cargarFormatos();
        this.verDetalle(res.data.id);
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible importar el formato.'));
        this.uploadLoading.set(false);
      },
    });
  }

  protected verDetalle(id: number): void {
    this.menuAbiertoId.set(null);
    this.formatosService.getById(id).subscribe({
      next: (res) => this.detalle.set(res.data),
      error: () => this.detalle.set(null),
    });
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  protected toggleActivo(formato: FormatoCalificacionListItem): void {
    this.menuAbiertoId.set(null);
    this.actionLoading.set(true);
    this.error.set(null);

    const req = formato.activo
      ? this.formatosService.desactivar(formato.id)
      : this.formatosService.activar(formato.id);

    req.subscribe({
      next: (res) => {
        this.feedback.set(res.message);
        this.actionLoading.set(false);
        this.cargarFormatos();
        if (this.detalle()?.id === formato.id) {
          this.verDetalle(formato.id);
        }
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible actualizar el formato.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected formatoRangoLabel(
    indicadorCodigo: string,
    min: string | null,
    max: string | null,
  ): string {
    return formatRangoIndicador(indicadorCodigo as IndicadorCodigo, min, max);
  }

  protected toggleMenu(formatoId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId.set(this.menuAbiertoId() === formatoId ? null : formatoId);
  }

  protected menuAbierto(formatoId: number): boolean {
    return this.menuAbiertoId() === formatoId;
  }

  private cargarFormatos(): void {
    this.loading.set(true);
    this.formatosService.list(false).subscribe({
      next: (res) => {
        this.formatos.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar los formatos.'));
        this.loading.set(false);
      },
    });
  }
}
