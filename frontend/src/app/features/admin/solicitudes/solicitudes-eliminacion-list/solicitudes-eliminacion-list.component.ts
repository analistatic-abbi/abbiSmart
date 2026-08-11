import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SolicitudesEliminacionService } from '../../../../core/services/solicitudes-eliminacion.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { confirmarAccion } from '../../../../core/utils/confirm-dialog.util';
import { SolicitudEliminacion } from '../../../../core/models/admin.model';

@Component({
  selector: 'app-solicitudes-eliminacion-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './solicitudes-eliminacion-list.component.html',
  styleUrl: './solicitudes-eliminacion-list.component.scss',
})
export class SolicitudesEliminacionListComponent implements OnInit {
  private readonly solicitudes = inject(SolicitudesEliminacionService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly items = signal<SolicitudEliminacion[]>([]);
  protected readonly loading = signal(true);
  protected readonly showRechazarModal = signal(false);
  protected readonly rechazarId = signal(0);
  protected readonly comentarioRechazo = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected aprobar(id: number): void {
    void confirmarAccion(this.confirmDialog, {
      title: 'Confirmar aprobación',
      message: '¿Desea aprobar esta solicitud de eliminación?',
      confirmLabel: 'Aprobar',
      variant: 'danger',
    }).then((ok) => {
      if (!ok) return;
      this.solicitudes.aprobar(id).subscribe({ next: () => this.load() });
    });
  }

  protected abrirRechazar(id: number): void {
    this.rechazarId.set(id);
    this.comentarioRechazo.set('');
    this.showRechazarModal.set(true);
  }

  protected confirmarRechazar(): void {
    const comentario = this.comentarioRechazo().trim();
    if (comentario.length < 3) return;

    void confirmarAccion(this.confirmDialog, {
      title: 'Confirmar rechazo',
      message: '¿Desea rechazar esta solicitud de eliminación?',
      confirmLabel: 'Rechazar',
      variant: 'danger',
    }).then((ok) => {
      if (!ok) return;

      this.solicitudes.rechazar(this.rechazarId(), comentario).subscribe({
        next: () => {
          this.showRechazarModal.set(false);
          this.load();
        },
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.solicitudes.listPendientes().subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }
}
