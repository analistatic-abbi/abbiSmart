import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ParametroHistorial,
  ParametroPorAnioItem,
  ParametroPorAnioResponseItem,
  ParametrosPropagacion,
  ParametrosService,
} from '../../../../core/services/parametros.service';
import { INDICADORES_ORDEN, IndicadorCodigo } from '../../../../core/models/proceso.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Rol } from '../../../../core/models/rol.enum';
import { formatParametroValor, indicadorValorHint, parametroValorTitle } from '../../../../core/utils/parametro.util';
import { formatFechaHora } from '../../../../core/utils/date.util';

interface IndicadorAnioRow {
  indicadorCodigo: IndicadorCodigo;
  id: number | null;
  valor: number | null;
  reglaCumplimiento: string;
}

@Component({
  selector: 'app-parametros-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './parametros-list.component.html',
  styleUrl: './parametros-list.component.scss',
})
export class ParametrosListComponent implements OnInit {
  private readonly parametros = inject(ParametrosService);
  private readonly auth = inject(AuthService);

  protected readonly indicadores = INDICADORES_ORDEN;
  protected readonly reglas = ['Mayor o igual al requerido', 'Menor o igual al requerido'];
  protected readonly puedeEditar = () => this.auth.rol() === Rol.Administrador;
  protected readonly anioActual = new Date().getFullYear();

  protected readonly anioSeleccionado = signal(new Date().getFullYear());
  protected readonly filas = signal<IndicadorAnioRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly dirty = signal(false);
  protected readonly feedback = signal<string | null>(null);

  protected readonly showHistorial = signal(false);
  protected readonly historialItems = signal<ParametroHistorial[]>([]);
  protected readonly historialIndicador = signal<IndicadorCodigo | null>(null);

  protected readonly formatValor = formatParametroValor;
  protected readonly valorHint = indicadorValorHint;
  protected readonly parametroValorTitle = parametroValorTitle;
  protected readonly formatFecha = formatFechaHora;

  protected readonly tieneDatos = computed(() =>
    this.filas().some((fila) => fila.valor !== null),
  );

  ngOnInit(): void {
    this.load();
  }

  protected onAnioChange(value: number | string): void {
    const anio = Number(value);
    if (!Number.isFinite(anio)) return;
    this.anioSeleccionado.set(anio);
    this.load();
  }

  protected actualizarValor(indicadorCodigo: IndicadorCodigo, value: string): void {
    const valor = value === '' ? null : Number(value);
    this.filas.update((filas) =>
      filas.map((fila) =>
        fila.indicadorCodigo === indicadorCodigo ? { ...fila, valor } : fila,
      ),
    );
    this.dirty.set(true);
  }

  protected actualizarRegla(indicadorCodigo: IndicadorCodigo, regla: string): void {
    this.filas.update((filas) =>
      filas.map((fila) =>
        fila.indicadorCodigo === indicadorCodigo
          ? { ...fila, reglaCumplimiento: regla }
          : fila,
      ),
    );
    this.dirty.set(true);
  }

  protected guardar(): void {
    const payload: ParametroPorAnioItem[] = this.filas()
      .filter((fila) => fila.valor !== null && Number.isFinite(fila.valor))
      .map((fila) => ({
        indicadorCodigo: fila.indicadorCodigo,
        valor: fila.valor as number,
        reglaCumplimiento: fila.reglaCumplimiento,
      }));

    if (payload.length === 0) {
      this.error.set('Ingrese al menos un indicador para guardar.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.feedback.set(null);
    this.parametros.upsertPorAnio(this.anioSeleccionado(), payload).subscribe({
      next: (response) => {
        this.applyData(response.data.indicadores);
        this.dirty.set(false);
        this.guardando.set(false);
        this.feedback.set(this.mensajePropagacion(response.data.propagacion));
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No fue posible guardar los parámetros del año.');
      },
    });
  }

  protected abrirHistorial(indicadorCodigo: IndicadorCodigo): void {
    const fila = this.filas().find((item) => item.indicadorCodigo === indicadorCodigo);
    if (!fila?.id) return;

    this.historialIndicador.set(indicadorCodigo);
    this.parametros.getHistorial(fila.id).subscribe({
      next: (response) => {
        this.historialItems.set(response.data);
        this.showHistorial.set(true);
      },
    });
  }

  protected esReglaMenor(regla: string): boolean {
    return regla.toLowerCase().includes('menor');
  }

  private mensajePropagacion(propagacion?: ParametrosPropagacion): string {
    if (!propagacion) {
      return 'Parámetros guardados.';
    }

    const partes = [
      `${propagacion.indicadoresActualizados} indicador(es) de proceso actualizado(s)`,
      `${propagacion.calificacionesActualizadas} calificación(es) recalculada(s)`,
    ];

    if (propagacion.calificacionesOmitidas > 0) {
      partes.push(
        `${propagacion.calificacionesOmitidas} calificación(es) no pudieron recalcularse (revisar rangos del formato)`,
      );
    }

    return `Parámetros guardados. ${partes.join(' · ')}.`;
  }

  protected formatHistorialValor(campo: string | null, valor: string | null): string {
    if (!valor) return '—';
    const indicador = this.historialIndicador();
    if (campo === 'valor' && indicador) return formatParametroValor(indicador, valor);
    return valor;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.parametros.getPorAnio(this.anioSeleccionado()).subscribe({
      next: (response) => {
        this.applyData(response.data.indicadores);
        this.dirty.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.filas.set(this.buildFilasVacias());
        this.loading.set(false);
        this.error.set('No fue posible cargar los parámetros del año.');
      },
    });
  }

  private applyData(indicadores: ParametroPorAnioResponseItem[]): void {
    this.filas.set(
      INDICADORES_ORDEN.map((indicadorCodigo) => {
        const item = indicadores.find(
          (indicador) => indicador.indicadorCodigo === indicadorCodigo,
        );
        return {
          indicadorCodigo,
          id: item?.id ?? null,
          valor: item?.valor !== null && item?.valor !== undefined ? Number(item.valor) : null,
          reglaCumplimiento: item?.reglaCumplimiento ?? 'Mayor o igual al requerido',
        };
      }),
    );
  }

  private buildFilasVacias(): IndicadorAnioRow[] {
    return INDICADORES_ORDEN.map((indicadorCodigo) => ({
      indicadorCodigo,
      id: null,
      valor: null,
      reglaCumplimiento: 'Mayor o igual al requerido',
    }));
  }
}
