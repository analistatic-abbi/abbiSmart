import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelacionamientosService } from '../../../../core/services/relacionamientos.service';
import { ContactosService } from '../../../../core/services/contactos.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CanalRelacionamiento,
  Relacionamiento,
  RelacionamientoVencido,
  ResultadoRelacionamiento,
} from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';

type Vista = 'todos' | 'vencidos';

@Component({
  selector: 'app-relacionamientos-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CrmTabsComponent],
  templateUrl: './relacionamientos-list.component.html',
  styleUrl: './relacionamientos-list.component.scss',
})
export class RelacionamientosListComponent implements OnInit {
  private readonly relacionamientos = inject(RelacionamientosService);
  private readonly contactos = inject(ContactosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<Relacionamiento[]>([]);
  protected readonly vencidos = signal<RelacionamientoVencido[]>([]);
  protected readonly contactoMap = signal<Record<number, string>>({});
  protected readonly loading = signal(true);
  protected readonly vista = signal<Vista>('todos');
  protected readonly search = signal('');
  protected readonly canales = Object.values(CanalRelacionamiento);
  protected readonly resultados = Object.values(ResultadoRelacionamiento);
  protected readonly canal = signal<CanalRelacionamiento | ''>('');
  protected readonly resultado = signal<ResultadoRelacionamiento | ''>('');

  ngOnInit(): void {
    this.contactos.list({ limit: 500 }).subscribe({
      next: (r) => {
        const map: Record<number, string> = {};
        for (const c of r.data) {
          map[c.id] = c.nombre;
        }
        this.contactoMap.set(map);
      },
    });
    this.load();
  }

  protected contactoLabel(id: number): string {
    return this.contactoMap()[id] ?? `#${id}`;
  }

  protected setVista(vista: Vista): void {
    this.vista.set(vista);
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    if (this.vista() === 'vencidos') {
      this.relacionamientos.listVencidos().subscribe({
        next: (r) => {
          this.vencidos.set(r.data);
          this.loading.set(false);
        },
        error: () => {
          this.vencidos.set([]);
          this.loading.set(false);
        },
      });
      return;
    }

    this.relacionamientos
      .list({
        search: this.search() || undefined,
        canal: this.canal() || undefined,
        resultado: this.resultado() || undefined,
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
