import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContactosService } from '../../../../core/services/contactos.service';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import {
  CanalRelacionamiento,
  Contacto,
  ResultadoRelacionamiento,
} from '../../../../core/models/crm.model';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-relacionamiento-form',
  standalone: true,
  imports: [FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './relacionamiento-form.component.html',
  styleUrl: './relacionamiento-form.component.scss',
})
export class RelacionamientoFormComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly relacionamientos = inject(RelacionamientosService);
  private readonly contactos = inject(ContactosService);

  protected readonly canales = Object.values(CanalRelacionamiento);
  protected readonly resultados = Object.values(ResultadoRelacionamiento);
  protected readonly resultadoReunion = ResultadoRelacionamiento.ReunionProgramada;
  protected readonly resultadoReferido = ResultadoRelacionamiento.ReferidoTercero;

  protected readonly contactosList = signal<Contacto[]>([]);
  protected readonly contactoOptions = computed(() =>
    this.contactosList().map((contacto) => ({
      value: contacto.id,
      label: `${contacto.nombre} (cliente #${contacto.clienteId})`,
    })),
  );
  protected readonly contactoId = signal<number | null>(null);
  protected readonly canal = signal<CanalRelacionamiento>(CanalRelacionamiento.Correo);
  protected readonly mensaje = signal('');
  protected readonly fechaMensaje = signal('');
  protected readonly diasEsperaRespuesta = signal(7);
  protected readonly resultado = signal<ResultadoRelacionamiento>(ResultadoRelacionamiento.Ninguno);
  protected readonly fechaReunion = signal('');

  protected readonly refNombre = signal('');
  protected readonly refCargo = signal('');
  protected readonly refTelefono = signal('');
  protected readonly refCorreo = signal('');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.contactos.list({ limit: 200 }).subscribe((r) => this.contactosList.set(r.data));
  }

  protected guardar(): void {
    const contactoId = this.contactoId();
    if (!contactoId || !this.mensaje().trim() || !this.fechaMensaje()) {
      this.error.set('Complete contacto, mensaje y fecha.');
      return;
    }

    const payload = {
      contactoId,
      canal: this.canal(),
      mensaje: this.mensaje().trim(),
      fechaMensaje: this.fechaMensaje(),
      diasEsperaRespuesta: this.diasEsperaRespuesta(),
      resultado: this.resultado(),
      ...(this.resultado() === ResultadoRelacionamiento.ReunionProgramada
        ? { fechaReunion: this.fechaReunion() }
        : {}),
      ...(this.resultado() === ResultadoRelacionamiento.ReferidoTercero
        ? {
            contactoReferido: {
              nombre: this.refNombre().trim(),
              cargo: this.refCargo().trim() || undefined,
              telefono: this.refTelefono().trim() || undefined,
              correo: this.refCorreo().trim() || undefined,
            },
          }
        : {}),
    };

    this.loading.set(true);
    this.relacionamientos.create(payload).subscribe({
      next: (r) => void this.router.navigate(['/crm/relacionamientos', r.relacionamiento.id]),
      error: () => {
        this.error.set('No fue posible registrar el relacionamiento.');
        this.loading.set(false);
      },
    });
  }
}
