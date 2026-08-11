import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ContactosService } from '../../../../core/services/contactos.service';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import {
  CanalRelacionamiento,
  Contacto,
} from '../../../../core/models/crm.model';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { mensajeErrorApi, mensajeExitoApi } from '../../../../core/utils/api-error.util';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarCreacion } from '../../../../core/utils/confirm-dialog.util';

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
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly canales = Object.values(CanalRelacionamiento);

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
  protected readonly fechaAlertaRespuesta = signal('');

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.contactos.list({ limit: 200 }).subscribe((r) => this.contactosList.set(r.data));
  }

  protected guardar(): void {
    this.error.set(null);

    const contactoId = this.contactoId();
    if (!contactoId || !this.mensaje().trim() || !this.fechaMensaje() || !this.fechaAlertaRespuesta()) {
      this.error.set('Complete contacto, mensaje, fecha del mensaje y fecha de alerta.');
      return;
    }

    if (this.fechaAlertaRespuesta() < this.fechaMensaje()) {
      this.error.set('La fecha de alerta no puede ser anterior a la fecha del mensaje.');
      return;
    }

    const payload = {
      contactoId,
      canal: this.canal(),
      mensaje: this.mensaje().trim(),
      fechaMensaje: this.fechaMensaje(),
      fechaAlertaRespuesta: this.fechaAlertaRespuesta(),
    };

    void confirmarCreacion(
      this.confirmDialog,
      '¿Desea registrar el relacionamiento?',
    ).then((ok) => {
      if (!ok) return;

      this.loading.set(true);
      this.relacionamientos.create(payload).subscribe({
        next: (r) => {
          this.toast.success(mensajeExitoApi(r, 'Relacionamiento creado correctamente.'));
          void this.router.navigate(['/crm/relacionamientos', r.relacionamiento.id]);
        },
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible registrar el relacionamiento.'));
          this.loading.set(false);
        },
      });
    });
  }
}
