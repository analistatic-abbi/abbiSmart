import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContactosService } from '../../../../core/services/contactos.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Contacto } from '../../../../core/models/crm.model';
import { CrmTabsComponent } from '../../shared/crm-tabs.component';

@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [FormsModule, RouterLink, CrmTabsComponent],
  templateUrl: './contactos-list.component.html',
  styleUrl: './contactos-list.component.scss',
})
export class ContactosListComponent implements OnInit {
  private readonly contactos = inject(ContactosService);
  private readonly auth = inject(AuthService);

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();

  protected readonly items = signal<Contacto[]>([]);
  protected readonly loading = signal(true);
  protected readonly search = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.contactos.list({ search: this.search() || undefined }).subscribe({
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
