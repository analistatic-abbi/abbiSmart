import { Component, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import { ProyeccionesService } from '../../../../core/services/proyecciones.service';

import { MercadoProyeccion, Proyeccion } from '../../../../core/models/admin.model';

import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarGuardado } from '../../../../core/utils/confirm-dialog.util';



interface AsignacionRow {

  proyeccionId: number;

  empresa: string;

  procesoCodigo: string | null;

  mercado: MercadoProyeccion | '';

}



@Component({

  selector: 'app-asignar-mercado',

  standalone: true,

  imports: [FormsModule, RouterLink],

  templateUrl: './asignar-mercado.component.html',

  styleUrl: './asignar-mercado.component.scss',

})

export class AsignarMercadoComponent implements OnInit {

  private readonly proyecciones = inject(ProyeccionesService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);



  protected readonly mercados = Object.values(MercadoProyeccion);

  protected readonly anio = signal(new Date().getFullYear() + 1);

  protected readonly soloSinMercado = signal(true);

  protected readonly rows = signal<AsignacionRow[]>([]);

  protected readonly loading = signal(true);

  protected readonly saving = signal(false);

  protected readonly message = signal<string | null>(null);

  protected readonly error = signal<string | null>(null);



  ngOnInit(): void {

    this.load();

  }



  protected onAnioChange(): void {

    this.load();

  }



  protected onFiltroChange(): void {

    this.load();

  }



  protected updateMercado(index: number, mercado: string): void {

    this.rows.update((items) =>

      items.map((row, i) =>

        i === index ? { ...row, mercado: mercado as MercadoProyeccion | '' } : row,

      ),

    );

  }



  protected guardar(): void {

    const asignaciones = this.rows()

      .filter((r) => r.mercado)

      .map((r) => ({ proyeccionId: r.proyeccionId, mercado: r.mercado as string }));



    if (!asignaciones.length) {

      this.error.set('Seleccione al menos una asignación de mercado.');

      return;

    }



    void confirmarGuardado(

      this.confirmDialog,

      `¿Desea guardar ${asignaciones.length} asignación(es) de mercado?`,

    ).then((ok) => {

      if (!ok) return;



      this.saving.set(true);

      this.error.set(null);

      this.proyecciones.asignarMercado(this.anio(), asignaciones).subscribe({

        next: (r) => {

          this.message.set(r.message);

          this.toast.success(mensajeExitoApi(r, 'Mercado asignado correctamente.'));

          this.saving.set(false);

          this.load();

        },

        error: (err) => {

          this.error.set(mensajeErrorApi(err, 'No fue posible guardar las asignaciones.'));

          this.saving.set(false);

        },

      });

    });

  }



  private load(): void {

    this.loading.set(true);

    this.message.set(null);

    this.proyecciones

      .list({ anioProyectado: this.anio(), limit: 500 })

      .subscribe({

        next: (r) => {

          const filtered = this.soloSinMercado()

            ? r.data.filter((p) => !p.mercado)

            : r.data;

          this.rows.set(filtered.map((p) => this.toRow(p)));

          this.loading.set(false);

        },

        error: () => {

          this.rows.set([]);

          this.loading.set(false);

        },

      });

  }



  private toRow(p: Proyeccion): AsignacionRow {

    return {

      proyeccionId: p.id,

      empresa: p.empresa ?? '—',

      procesoCodigo: p.procesoCodigo ?? null,

      mercado: (p.mercado as MercadoProyeccion) ?? '',

    };

  }

}


