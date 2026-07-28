import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../../../core/services/audit.service';
import { AuditLog } from '../../../../core/models/admin.model';

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
  protected readonly entidadTipo = signal('');
  protected readonly accion = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.audit
      .list({
        entidadTipo: this.entidadTipo() || undefined,
        accion: this.accion() || undefined,
      })
      .subscribe({
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
