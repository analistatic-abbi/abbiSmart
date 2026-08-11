import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { EstadoKamRonda, KamListItem } from '../../../core/models/kam.model';
import { claseBadgeEstadoKamRonda } from '../../../core/utils/kam-ui.util';
import { KamVistaToggleComponent } from '../kam-vista-toggle/kam-vista-toggle.component';
import { TablePaginationComponent } from '../../../shared/components/table-pagination/table-pagination.component';

@Component({
  selector: 'app-kam-list',
  standalone: true,
  imports: [FormsModule, RouterLink, KamVistaToggleComponent, TablePaginationComponent],
  templateUrl: './kam-list.component.html',
  styleUrl: './kam-list.component.scss',
})
export class KamListComponent implements OnInit {
  private readonly kamService = inject(KamService);

  protected readonly items = signal<KamListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly estados = Object.values(EstadoKamRonda);
  protected readonly estado = signal<EstadoKamRonda | ''>('');
  protected readonly sinReunionAgendada = signal(false);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly total = signal(0);
  protected readonly alertaCount = signal(0);
  protected readonly badgeClass = (estado: string | null) => claseBadgeEstadoKamRonda(estado);

  ngOnInit(): void {
    this.loadAlertaCount();
    this.load();
  }

  protected onFilter(): void {
    this.page.set(1);
    this.load();
  }

  protected toggleAlerta(): void {
    this.sinReunionAgendada.update((v) => !v);
    this.page.set(1);
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected onLimitChange(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.kamService
      .list({
        search: this.search() || undefined,
        estadoRonda: this.estado() || undefined,
        sinReunionAgendada: this.sinReunionAgendada() || undefined,
        page: this.page(),
        limit: this.limit(),
      })
      .subscribe({
        next: (r) => {
          this.items.set(r.data);
          this.total.set(r.total);
          this.loading.set(false);
          if (this.sinReunionAgendada()) {
            this.alertaCount.set(r.total);
          }
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  private loadAlertaCount(): void {
    this.kamService.list({ sinReunionAgendada: true, page: 1, limit: 1 }).subscribe({
      next: (r) => this.alertaCount.set(r.total),
      error: () => this.alertaCount.set(0),
    });
  }
}
