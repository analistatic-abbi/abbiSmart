import { Component, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { ProyeccionesService } from '../../../../core/services/proyecciones.service';

import { AuthService } from '../../../../core/services/auth.service';

import { mensajeErrorApi } from '../../../../core/utils/api-error.util';



@Component({

  selector: 'app-proyeccion-form',

  standalone: true,

  imports: [FormsModule, RouterLink],

  templateUrl: './proyeccion-form.component.html',

  styleUrl: './proyeccion-form.component.scss',

})

export class ProyeccionFormComponent {

  private readonly router = inject(Router);

  private readonly proyecciones = inject(ProyeccionesService);

  protected readonly auth = inject(AuthService);



  protected readonly anioProyectado = signal(new Date().getFullYear());

  protected readonly fechaEstimadaPublicacion = signal('');

  protected readonly valorVenta = signal(0);

  protected readonly valorFacturacion = signal(0);

  protected readonly procesoOrigenId = signal<number | null>(null);

  protected readonly loading = signal(false);

  protected readonly error = signal<string | null>(null);



  protected guardar(): void {

    if (!this.auth.puedeEscribir()) {

      this.error.set('No tiene permisos para crear proyecciones.');

      return;

    }



    if (!this.fechaEstimadaPublicacion()) {

      this.error.set('Complete la fecha estimada de publicación.');

      return;

    }



    this.loading.set(true);

    this.error.set(null);

    this.proyecciones

      .create({

        anioProyectado: this.anioProyectado(),

        fechaEstimadaPublicacion: this.fechaEstimadaPublicacion(),

        valorVenta: this.valorVenta(),

        valorFacturacion: this.valorFacturacion(),

        ...(this.procesoOrigenId() ? { procesoOrigenId: this.procesoOrigenId()! } : {}),

      })

      .subscribe({

        next: (r) => void this.router.navigate(['/proyecciones', r.proyeccion.id]),

        error: (err) => {

          this.error.set(mensajeErrorApi(err, 'No fue posible crear la proyección.'));

          this.loading.set(false);

        },

      });

  }

}


