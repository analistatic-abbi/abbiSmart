import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { FormatosEncuestaService } from '../../../core/services/formatos-encuesta.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  EstadoKamRonda,
  KamDetail,
  KamEncuesta,
  KamRonda,
} from '../../../core/models/kam.model';
import { FormatoEncuestaListItem } from '../../../core/models/formato-encuesta.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../core/utils/api-error.util';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { confirmarAccion } from '../../../core/utils/confirm-dialog.util';
import { claseBadgeEstadoKamRonda } from '../../../core/utils/kam-ui.util';
import { formatFechaHora } from '../../../core/utils/date.util';
import { AsignarFormatoModalComponent } from '../modals/asignar-formato-modal/asignar-formato-modal.component';
import { AgendarReunionModalComponent } from '../modals/agendar-reunion-modal/agendar-reunion-modal.component';

@Component({
  selector: 'app-kam-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    AsignarFormatoModalComponent,
    AgendarReunionModalComponent,
  ],
  templateUrl: './kam-detail.component.html',
  styleUrl: './kam-detail.component.scss',
})
export class KamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kamService = inject(KamService);
  private readonly formatosService = inject(FormatosEncuestaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly kam = signal<KamDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formatosActivos = signal<FormatoEncuestaListItem[]>([]);
  protected readonly rondaExpandida = signal<number | null>(null);
  protected readonly bitacora = signal<Record<number, string>>({});
  protected readonly veredictoRonda = signal<Record<number, string>>({});
  protected readonly archivoCorrespondencia = signal<Record<number, File[]>>({});
  protected readonly modalAsignarAbierto = signal(false);
  protected readonly modalAgendarAbierto = signal(false);
  protected readonly rondaModalId = signal<number | null>(null);
  protected readonly savingVeredictoRondaId = signal<number | null>(null);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly estados = EstadoKamRonda;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoKamRonda(estado);
  protected readonly formatFechaHora = formatFechaHora;

  protected readonly rondasOrdenadas = computed(() => {
    const k = this.kam();
    if (!k) return [];
    return [...k.rondas].sort((a, b) => b.numero - a.numero);
  });

  protected readonly rondaModal = computed(() => {
    const id = this.rondaModalId();
    if (!id) return null;
    return this.kam()?.rondas.find((r) => r.id === id) ?? null;
  });

  protected kamId = 0;

  ngOnInit(): void {
    this.kamId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.formatosService.list(true).subscribe({
      next: (r) => this.formatosActivos.set(r.data),
      error: () => this.formatosActivos.set([]),
    });
  }

  protected toggleRonda(rondaId: number): void {
    this.rondaExpandida.set(this.rondaExpandida() === rondaId ? null : rondaId);
  }

  protected rondaExpandidaEs(rondaId: number): boolean {
    return this.rondaExpandida() === rondaId;
  }

  protected rondaEditable(ronda: KamRonda): boolean {
    return this.puedeEscribir() && ronda.estado === EstadoKamRonda.Pendiente;
  }

  protected crearRonda(): void {
    this.actionLoading.set(true);
    this.kamService.crearRonda(this.kamId).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.actionLoading.set(false);
        this.cargar(res.data.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible crear la ronda.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected guardarBitacora(ronda: KamRonda): void {
    const texto = (this.bitacora()[ronda.id] ?? '').trim();
    if (!texto) {
      this.toast.error('El comentario no puede estar vacío.');
      return;
    }

    this.actionLoading.set(true);
    this.kamService.agregarBitacora(this.kamId, ronda.id, texto).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.actionLoading.set(false);
        this.bitacora.update((s) => ({ ...s, [ronda.id]: '' }));
        this.cargar(ronda.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible agregar el comentario.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected archivosCorrespondencia(ronda: KamRonda) {
    if (ronda.correspondencias?.length) return ronda.correspondencias;
    if (ronda.correspondenciaNombre) {
      return [
        {
          id: 0,
          nombre: ronda.correspondenciaNombre,
          url: ronda.correspondenciaUrl ?? '',
        },
      ];
    }
    return [];
  }

  protected subirCorrespondencia(ronda: KamRonda): void {
    const archivos = this.archivoCorrespondencia()[ronda.id] ?? [];
    if (!archivos.length) {
      this.toast.error('Seleccione al menos un archivo.');
      return;
    }

    this.actionLoading.set(true);
    this.kamService.subirCorrespondencia(this.kamId, ronda.id, archivos).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.actionLoading.set(false);
        this.archivoCorrespondencia.update((s) => ({ ...s, [ronda.id]: [] }));
        this.cargar(ronda.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible subir la correspondencia.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected descargarCorrespondencia(
    ronda: KamRonda,
    archivo: { id: number; nombre: string },
  ): void {
    this.kamService.descargarCorrespondencia(
      this.kamId,
      ronda.id,
      archivo.nombre,
      archivo.id > 0 ? archivo.id : undefined,
    );
  }

  protected eliminarCorrespondencia(ronda: KamRonda, archivoId?: number): void {
    void confirmarAccion(this.confirmDialog, {
      title: 'Eliminar correspondencia',
      message: archivoId
        ? '¿Desea eliminar este archivo de correspondencia?'
        : '¿Desea eliminar toda la correspondencia?',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    }).then((ok) => {
      if (!ok) return;

      this.actionLoading.set(true);
      this.kamService.eliminarCorrespondencia(this.kamId, ronda.id, archivoId).subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.actionLoading.set(false);
          this.cargar(ronda.id);
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible eliminar la correspondencia.'));
          this.actionLoading.set(false);
        },
      });
    });
  }

  protected abrirModalAsignar(ronda: KamRonda): void {
    this.rondaModalId.set(ronda.id);
    this.modalAsignarAbierto.set(true);
  }

  protected cerrarModalAsignar(): void {
    this.modalAsignarAbierto.set(false);
    this.rondaModalId.set(null);
  }

  protected confirmarAsignar(payload: { formatoEncuestaId: number; contactoId: number }): void {
    const ronda = this.rondaModal();
    if (!ronda) return;

    this.actionLoading.set(true);
    this.kamService.crearEncuesta(this.kamId, ronda.id, payload).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.actionLoading.set(false);
        this.cerrarModalAsignar();
        this.cargar(ronda.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible asignar el formato.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected contactoEncuesta(encuesta: KamEncuesta) {
    return encuesta.contactos[0] ?? null;
  }

  protected estadoEncuestaLabel(completo: boolean): string {
    return completo ? 'Completa' : 'Pendiente de respuesta';
  }

  protected estadoEncuestaClass(completo: boolean): string {
    return completo ? 'badge badge--encuesta-completa' : 'badge badge--encuesta-pendiente';
  }

  protected ejecutarRonda(ronda: KamRonda): void {
    void confirmarAccion(this.confirmDialog, {
      title: 'Cerrar fase de encuestas',
      message:
        '¿Confirma que la fase de encuestas terminó? Podrá agendar la reunión de fin de ronda después.',
      confirmLabel: 'Marcar fase de encuestas como completa',
    }).then((ok) => {
      if (!ok) return;

      this.actionLoading.set(true);
      this.kamService.ejecutarRonda(this.kamId, ronda.id).subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.actionLoading.set(false);
          this.cargar(ronda.id);
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible cerrar la fase de encuestas.'));
          this.actionLoading.set(false);
        },
      });
    });
  }

  protected abrirModalAgendar(ronda: KamRonda): void {
    this.rondaModalId.set(ronda.id);
    this.modalAgendarAbierto.set(true);
  }

  protected cerrarModalAgendar(): void {
    this.modalAgendarAbierto.set(false);
    this.rondaModalId.set(null);
  }

  protected confirmarAgendar(fecha: string): void {
    const ronda = this.rondaModal();
    if (!ronda) return;

    this.actionLoading.set(true);
    this.kamService.agendarReunion(this.kamId, ronda.id, fecha).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.actionLoading.set(false);
        this.cerrarModalAgendar();
        this.cargar(ronda.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible agendar la reunión.'));
        this.actionLoading.set(false);
      },
    });
  }

  protected socializarRonda(ronda: KamRonda): void {
    void confirmarAccion(this.confirmDialog, {
      title: 'Reunión realizada',
      message: '¿Confirma que la reunión de fin de ronda ya se realizó?',
      confirmLabel: 'Marcar como realizada',
    }).then((ok) => {
      if (!ok) return;

      this.actionLoading.set(true);
      this.kamService.socializarRonda(this.kamId, ronda.id).subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.actionLoading.set(false);
          this.cargar(ronda.id);
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible marcar la reunión como realizada.'));
          this.actionLoading.set(false);
        },
      });
    });
  }

  protected onArchivoCorrespondencia(rondaId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.archivoCorrespondencia.update((s) => ({ ...s, [rondaId]: files }));
  }

  protected setBitacora(rondaId: number, value: string): void {
    this.bitacora.update((s) => ({ ...s, [rondaId]: value }));
  }

  protected setVeredictoRonda(rondaId: number, value: string): void {
    this.veredictoRonda.update((s) => ({ ...s, [rondaId]: value }));
  }

  protected formatPorcentaje(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${Math.round(value)}%`;
  }

  protected guardarVeredictoRonda(ronda: KamRonda): void {
    const texto = (this.veredictoRonda()[ronda.id] ?? ronda.veredicto ?? '').trim();
    if (!texto) {
      this.toast.error('Indique el veredicto de la ronda.');
      return;
    }

    this.savingVeredictoRondaId.set(ronda.id);
    this.kamService.updateVeredictoRonda(this.kamId, ronda.id, { veredicto: texto }).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.savingVeredictoRondaId.set(null);
        this.cargar(ronda.id);
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible guardar el veredicto.'));
        this.savingVeredictoRondaId.set(null);
      },
    });
  }

  private cargar(expandRondaId?: number): void {
    this.loading.set(true);
    this.kamService.getById(this.kamId).subscribe({
      next: (res) => {
        const k = res.data;
        this.kam.set(k);

        const bitacoras: Record<number, string> = {};
        const veredictos: Record<number, string> = {};
        for (const r of k.rondas) {
          bitacoras[r.id] = this.bitacora()[r.id] ?? '';
          veredictos[r.id] = r.veredicto ?? '';
        }
        this.bitacora.set(bitacoras);
        this.veredictoRonda.set(veredictos);

        const rondaAExpandir =
          expandRondaId ?? [...k.rondas].sort((a, b) => b.numero - a.numero)[0]?.id ?? null;
        this.rondaExpandida.set(rondaAExpandir);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar el KAM.'));
        this.loading.set(false);
      },
    });
  }
}
