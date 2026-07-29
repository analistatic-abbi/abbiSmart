import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcesosService } from '../../../core/services/procesos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProcesoListItem } from '../../../core/models/proceso.model';

@Component({
  selector: 'app-procesos-list',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './procesos-list.component.html',
  styleUrl: './procesos-list.component.scss',
})
export class ProcesosListComponent implements OnInit {
  private readonly procesos = inject(ProcesosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<ProcesoListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly total = signal(0);
  protected readonly exportando = signal(false);
  protected readonly exportError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected exportar(): void {
    this.exportando.set(true);
    this.exportError.set(null);
    this.procesos.exportar(this.search(), (message) => {
      this.exportError.set(message);
      this.exportando.set(false);
    });
    setTimeout(() => this.exportando.set(false), 1500);
  }

  private load(): void {
    this.loading.set(true);
    this.procesos.list(1, 50, this.search()).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.total.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }
}
