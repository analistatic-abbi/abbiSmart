import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CanalRelacionamiento,
  Relacionamiento,
  ResultadoRelacionamiento,
} from '../../../../core/models/crm.model';
import { FijarEntidadButtonComponent } from '../../../../shared/components/fijar-entidad-button/fijar-entidad-button.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarGuardado } from '../../../../core/utils/confirm-dialog.util';

@Component({
  selector: 'app-relacionamiento-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, FijarEntidadButtonComponent, SearchableSelectComponent],
  templateUrl: './relacionamiento-detail.component.html',
  styleUrl: './relacionamiento-detail.component.scss',
})
export class RelacionamientoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly relacionamientos = inject(RelacionamientosService);
  private readonly catalogos = inject(CatalogosService);
  private readonly auth = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly item = signal<Relacionamiento | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly respuesta = signal('');
  protected readonly fechaRespuesta = signal('');
  protected readonly mensaje = signal('');
  protected readonly fechaMensaje = signal('');
  protected readonly fechaAlertaRespuesta = signal('');
  protected readonly canal = signal<CanalRelacionamiento>(CanalRelacionamiento.Correo);
  protected readonly resultado = signal<ResultadoRelacionamiento>(ResultadoRelacionamiento.Ninguno);
  protected readonly fechaReunion = signal('');

  protected readonly refNombre = signal('');
  protected readonly refCargo = signal('');
  protected readonly refTelefono = signal('');
  protected readonly refCorreo = signal('');
  protected readonly refDepartamento = signal('');
  protected readonly refUbicacionId = signal<number | null>(null);
  protected readonly refMunicipios = signal<Array<{ id: number; municipio: string }>>([]);
  protected readonly refMunicipioOptions = computed(() =>
    this.refMunicipios().map((m) => ({ value: m.id, label: m.municipio })),
  );

  protected readonly departamentos = signal<string[]>([]);

  protected readonly canales = Object.values(CanalRelacionamiento);
  protected readonly resultados = Object.values(ResultadoRelacionamiento);
  protected readonly resultadoReunion = ResultadoRelacionamiento.ReunionProgramada;
  protected readonly resultadoReferido = ResultadoRelacionamiento.ReferidoTercero;
  protected readonly resultadoNinguno = ResultadoRelacionamiento.Ninguno;

  private relacionamientoId = 0;

  ngOnInit(): void {
    this.relacionamientoId = Number(this.route.snapshot.paramMap.get('id'));
    this.catalogos.getDepartamentos().subscribe((r) => this.departamentos.set(r.data));
    this.load();
  }

  protected onRefDepartamentoChange(value: string): void {
    this.refDepartamento.set(value);
    this.refUbicacionId.set(null);
    if (!value) {
      this.refMunicipios.set([]);
      return;
    }
    this.catalogos.getMunicipios(value).subscribe({
      next: (r) =>
        this.refMunicipios.set(
          r.data.map((u) => ({ id: u.id, municipio: u.municipioProvincia })),
        ),
      error: () => this.refMunicipios.set([]),
    });
  }

  protected tieneContactoReferido(): boolean {
    return Boolean(this.item()?.contactoReferidoId);
  }

  protected guardar(): void {
    if (!this.puedeEscribir()) return;

    const resultado = this.resultado();

    if (resultado === ResultadoRelacionamiento.ReunionProgramada && !this.fechaReunion()) {
      this.error.set('Indique la fecha de reunión.');
      return;
    }

    if (
      resultado === ResultadoRelacionamiento.ReferidoTercero &&
      !this.tieneContactoReferido() &&
      !this.refNombre().trim()
    ) {
      this.error.set('Indique el nombre del contacto referido.');
      return;
    }

    const payload = {
      canal: this.canal(),
      mensaje: this.mensaje(),
      fechaMensaje: this.fechaMensaje(),
      resultado,
      fechaReunion:
        resultado === ResultadoRelacionamiento.ReunionProgramada
          ? this.fechaReunion()
          : undefined,
      respuesta: this.respuesta() || undefined,
      fechaRespuesta: this.fechaRespuesta() || undefined,
      ...(resultado === ResultadoRelacionamiento.ReferidoTercero &&
      !this.tieneContactoReferido()
        ? {
            contactoReferido: {
              nombre: this.refNombre().trim(),
              cargo: this.refCargo().trim() || undefined,
              telefono: this.refTelefono().trim() || undefined,
              correo: this.refCorreo().trim() || undefined,
              ubicacionId: this.refUbicacionId() ?? undefined,
            },
          }
        : {}),
    };

    void confirmarGuardado(
      this.confirmDialog,
      '¿Desea guardar los cambios del relacionamiento?',
    ).then((ok) => {
      if (!ok) return;

      this.saving.set(true);
      this.error.set(null);

      this.relacionamientos.update(this.relacionamientoId, payload).subscribe({
        next: (r) => {
          this.item.set(r.relacionamiento);
          this.saving.set(false);
        },
        error: () => {
          this.error.set('No fue posible actualizar el relacionamiento.');
          this.saving.set(false);
        },
      });
    });
  }

  private load(): void {
    this.relacionamientos.getById(this.relacionamientoId).subscribe({
      next: (r) => {
        const item = r.relacionamiento;
        this.item.set(item);
        this.respuesta.set(item.respuesta ?? '');
        this.fechaRespuesta.set(item.fechaRespuesta ?? '');
        this.mensaje.set(item.mensaje);
        this.fechaMensaje.set(item.fechaMensaje);
        this.fechaAlertaRespuesta.set(item.fechaAlertaRespuesta);
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
}
