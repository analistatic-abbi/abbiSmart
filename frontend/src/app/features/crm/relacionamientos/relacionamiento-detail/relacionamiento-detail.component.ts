import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CanalRelacionamiento,
  Relacionamiento,
  ResultadoRelacionamiento,
} from '../../../../core/models/crm.model';

@Component({
  selector: 'app-relacionamiento-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './relacionamiento-detail.component.html',
  styleUrl: './relacionamiento-detail.component.scss',
})
export class RelacionamientoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly relacionamientos = inject(RelacionamientosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly item = signal<Relacionamiento | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly respuesta = signal('');
  protected readonly fechaRespuesta = signal('');
  protected readonly mensaje = signal('');
  protected readonly fechaMensaje = signal('');
  protected readonly canal = signal<CanalRelacionamiento>(CanalRelacionamiento.Correo);
  protected readonly resultado = signal<ResultadoRelacionamiento>(ResultadoRelacionamiento.Ninguno);
  protected readonly fechaReunion = signal('');

  protected readonly canales = Object.values(CanalRelacionamiento);
  protected readonly resultados = Object.values(ResultadoRelacionamiento);
  protected readonly resultadoReunion = ResultadoRelacionamiento.ReunionProgramada;

  private relacionamientoId = 0;

  ngOnInit(): void {
    this.relacionamientoId = Number(this.route.snapshot.paramMap.get('id'));
    this.relacionamientos.getById(this.relacionamientoId).subscribe({
      next: (r) => {
        const item = r.relacionamiento;
        this.item.set(item);
        this.respuesta.set(item.respuesta ?? '');
        this.fechaRespuesta.set(item.fechaRespuesta ?? '');
        this.mensaje.set(item.mensaje);
        this.fechaMensaje.set(item.fechaMensaje);
        this.canal.set(item.canal);
        this.resultado.set(item.resultado);
        this.fechaReunion.set(item.fechaReunion ?? '');
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar el relacionamiento.');
        this.loading.set(false);
      },
    });
  }

  protected guardar(): void {
    if (!this.puedeEscribir()) return;

    this.saving.set(true);
    this.relacionamientos
      .update(this.relacionamientoId, {
        canal: this.canal(),
        mensaje: this.mensaje(),
        fechaMensaje: this.fechaMensaje(),
        resultado: this.resultado(),
        fechaReunion: this.fechaReunion() || undefined,
        respuesta: this.respuesta() || undefined,
        fechaRespuesta: this.fechaRespuesta() || undefined,
      })
      .subscribe({
        next: (r) => {
          this.item.set(r.relacionamiento);
          this.saving.set(false);
        },
        error: () => {
          this.error.set('No fue posible actualizar el relacionamiento.');
          this.saving.set(false);
        },
      });
  }
}
