import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ValidacionService } from '../../../../core/services/validacion.service';
import { ValidacionPendiente } from '../../../../core/models/admin.model';

@Component({
  selector: 'app-validacion-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './validacion-list.component.html',
  styleUrl: './validacion-list.component.scss',
})
export class ValidacionListComponent implements OnInit {
  private readonly validacion = inject(ValidacionService);

  protected readonly items = signal<ValidacionPendiente[]>([]);
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
    this.validacion.listPendientes(this.search() || undefined).subscribe({
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
