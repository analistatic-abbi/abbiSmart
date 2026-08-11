import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import {

  ParametroPorAnioItem,

  ParametroPorAnioResponseItem,

  ParametrosPropagacion,

  ParametrosService,

} from '../../../../core/services/parametros.service';

import { AuditLog } from '../../../../core/models/admin.model';

import { AuthService } from '../../../../core/services/auth.service';

import { Rol } from '../../../../core/models/rol.enum';

import { formatParametroValor, indicadorValorHint, parametroValorTitle } from '../../../../core/utils/parametro.util';

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarGuardado } from '../../../../core/utils/confirm-dialog.util';

import { mensajeExitoApi } from '../../../../core/utils/api-error.util';

import { AuditHistorialListComponent } from '../../../../shared/components/audit-historial-list/audit-historial-list.component';



interface IndicadorAnioRow {

  indicadorCodigo: string;

  id: number | null;

  valor: number | null;

  reglaCumplimiento: string;

}



@Component({

  selector: 'app-parametros-list',

  standalone: true,

  imports: [FormsModule, AuditHistorialListComponent],

  templateUrl: './parametros-list.component.html',

  styleUrl: './parametros-list.component.scss',

})

export class ParametrosListComponent implements OnInit {

  private readonly parametros = inject(ParametrosService);

  private readonly auth = inject(AuthService);

  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);



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

  protected readonly historialItems = signal<AuditLog[]>([]);

  protected readonly historialIndicador = signal<string | null>(null);

  protected readonly historialLoading = signal(false);

  protected readonly historialError = signal<string | null>(null);



  protected readonly formatValor = formatParametroValor;

  protected readonly valorHint = indicadorValorHint;

  protected readonly parametroValorTitle = parametroValorTitle;



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



  protected actualizarValor(indicadorCodigo: string, value: string): void {

    const valor = value === '' ? null : Number(value);

    this.filas.update((filas) =>

      filas.map((fila) =>

        fila.indicadorCodigo === indicadorCodigo ? { ...fila, valor } : fila,

      ),

    );

    this.dirty.set(true);

  }



  protected actualizarRegla(indicadorCodigo: string, regla: string): void {

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



    void confirmarGuardado(

      this.confirmDialog,

      `¿Desea guardar los parámetros del año ${this.anioSeleccionado()}?`,

    ).then((ok) => {

      if (!ok) return;



      this.guardando.set(true);

      this.error.set(null);

      this.feedback.set(null);

      this.parametros.upsertPorAnio(this.anioSeleccionado(), payload).subscribe({

        next: (response) => {

          this.applyData(response.data.indicadores);

          this.dirty.set(false);

          this.guardando.set(false);

          const mensaje = this.mensajePropagacion(response.data.propagacion);

          this.feedback.set(mensaje);

          this.toast.success(mensajeExitoApi(response, mensaje));

        },

        error: () => {

          this.guardando.set(false);

          const mensaje = 'No fue posible guardar los parámetros del año.';

          this.error.set(mensaje);

          this.toast.error(mensaje);

        },

      });

    });

  }



  protected abrirHistorial(indicadorCodigo: string): void {

    const fila = this.filas().find((item) => item.indicadorCodigo === indicadorCodigo);

    if (!fila?.id) return;



    this.historialIndicador.set(indicadorCodigo);

    this.historialLoading.set(true);

    this.historialError.set(null);

    this.parametros.getHistorial(fila.id).subscribe({

      next: (response) => {

        this.historialItems.set(response.data);

        this.historialLoading.set(false);

        this.showHistorial.set(true);

      },

      error: () => {

        this.historialItems.set([]);

        this.historialLoading.set(false);

        this.historialError.set('No fue posible cargar el historial del parámetro.');

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
      indicadores.map((item) => ({
        indicadorCodigo: item.indicadorCodigo,
        id: item.id ?? null,
        valor:
          item.valor !== null && item.valor !== undefined ? Number(item.valor) : null,
        reglaCumplimiento: item.reglaCumplimiento ?? 'Mayor o igual al requerido',
      })),
    );
  }

  private buildFilasVacias(): IndicadorAnioRow[] {
    return [];
  }

}


