import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { Cliente } from '../../../../core/models/crm.model';
import { CatalogoPaisItem } from '../../../../core/models/pais-config.model';
import {
  FILTRO_ELIMINADOS_OPCIONES,
  FiltroEliminados,
} from '../../../../core/models/filtro-eliminados.model';
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
  private readonly catalogos = inject(CatalogosService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly puedeVerEliminados = () => this.auth.puedeVerEliminados();
  protected readonly filtrosEliminados = FILTRO_ELIMINADOS_OPCIONES;

  protected readonly items = signal<Cliente[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly segmento = signal('');
  protected readonly filtroEliminados = signal<FiltroEliminados>('activos');
  protected readonly segmentos = signal<CatalogoPaisItem[]>([]);

  ngOnInit(): void {
    this.catalogos.getCatalogoSesion('segmento_cliente', false).subscribe((r) =>
      this.segmentos.set(r.data),
    );
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
        filtroEliminados: this.filtroEliminados(),
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
