import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Cliente, SegmentoCliente } from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CrmTabsComponent, DatePipe],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
})
export class ClientesListComponent implements OnInit {
  private readonly clientes = inject(ClientesService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<Cliente[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly segmento = signal<SegmentoCliente | ''>('');
  protected readonly segmentos = Object.values(SegmentoCliente);

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.clientes
      .list({
        search: this.search() || undefined,
        segmento: this.segmento() || undefined,
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
