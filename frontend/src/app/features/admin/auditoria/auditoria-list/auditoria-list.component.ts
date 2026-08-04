import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../../../core/services/audit.service';
import { AuditLog } from '../../../../core/models/admin.model';
import { formatFechaHora } from '../../../../core/utils/date.util';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';

@Component({
  selector: 'app-auditoria-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './auditoria-list.component.html',
  styleUrl: './auditoria-list.component.scss',
})
export class AuditoriaListComponent implements OnInit {
  private readonly audit = inject(AuditService);

  protected readonly items = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly entidadTipo = signal('');
  protected readonly accion = signal('');
  protected readonly fecha = signal('');
  protected readonly formatFechaHora = formatFechaHora;

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected usuarioLabel(log: AuditLog): string {
    if (log.usuarioNombre) return log.usuarioNombre;
    if (log.usuarioId) return `Usuario #${log.usuarioId}`;
    return 'Sistema';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.audit
      .list({
        entidadTipo: this.entidadTipo() || undefined,
        accion: this.accion() || undefined,
        fecha: this.fecha() || undefined,
        limit: 50,
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total ?? r.data.length);
          this.loading.set(false);
        },
        error: (err) => {
          this.items.set([]);
          this.total.set(0);
          this.error.set(mensajeErrorApi(err, 'No se pudieron cargar los registros de auditoría.'));
          this.loading.set(false);
        },
      });
  }
}
