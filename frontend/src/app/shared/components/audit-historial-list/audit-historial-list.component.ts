import { Component, input } from '@angular/core';
import { AuditLog } from '../../../core/models/admin.model';
import { formatFechaHora } from '../../../core/utils/date.util';
import {
  accionHistorialLabel,
  buildAuditHistorialCambios,
  historialUsuarioLabel,
} from '../../../core/utils/audit-historial.util';

@Component({
  selector: 'app-audit-historial-list',
  standalone: true,
  templateUrl: './audit-historial-list.component.html',
  styleUrl: './audit-historial-list.component.scss',
})
export class AuditHistorialListComponent {
  readonly items = input.required<AuditLog[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly emptyMessage = input('Sin historial registrado.');
  readonly indicador = input<string | null>(null);

  protected readonly formatFecha = formatFechaHora;

  protected accion(item: AuditLog): string {
    return accionHistorialLabel(item.accion, item.accionLabel);
  }

  protected usuario(item: AuditLog): string {
    return historialUsuarioLabel(item);
  }

  protected cambios(item: AuditLog) {
    const indicador = this.indicador();
    return buildAuditHistorialCambios(item, indicador ? { indicador } : {});
  }
}
