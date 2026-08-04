import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { Rol } from '../../../../core/models/rol.enum';
import { mensajeErrorApi } from '../../../../core/utils/api-error.util';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
})
export class UsuarioFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuarios = inject(UsuariosService);
  private readonly catalogos = inject(CatalogosService);

  protected readonly roles = Object.values(Rol);
  protected readonly paises = signal<Array<{ id: number; nombre: string }>>([]);

  protected readonly nombre = signal('');
  protected readonly correo = signal('');
  protected readonly rol = signal<Rol>(Rol.Operador);
  protected readonly paisId = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private usuarioId = 0;
  protected readonly isEdit = signal(false);

  ngOnInit(): void {
    this.catalogos.getPaises().subscribe((r) => {
      this.paises.set(
        r.data.map((p) => ({ id: Number(p.id), nombre: p.nombre })),
      );
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.usuarioId = Number(idParam);
      this.isEdit.set(true);
      this.usuarios.list({ limit: 200 }).subscribe({
        next: (r) => {
          const u = r.data.find((item) => item.id === this.usuarioId);
          if (u) {
            this.nombre.set(u.nombre);
            this.correo.set(u.correo);
            this.rol.set(u.rol);
            this.paisId.set(u.paisId != null ? Number(u.paisId) : null);
          }
        },
      });
    }
  }

  protected comparePais(a: number | null, b: number | null): boolean {
    if (a == null || b == null) {
      return a === b;
    }
    return Number(a) === Number(b);
  }

  protected onPaisChange(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.paisId.set(null);
      return;
    }
    this.paisId.set(Number(value));
  }

  protected paisSeleccionadoNombre(): string | null {
    const id = this.paisId();
    if (id == null) {
      return null;
    }
    return this.paises().find((p) => Number(p.id) === Number(id))?.nombre ?? null;
  }

  protected guardar(): void {
    this.error.set(null);

    const paisId = this.paisId();
    if (!this.nombre().trim() || !paisId) {
      this.error.set('Complete nombre y país.');
      return;
    }

    this.loading.set(true);

    if (this.isEdit()) {
      this.usuarios
        .update(this.usuarioId, {
          nombre: this.nombre().trim(),
          rol: this.rol(),
          paisId,
        })
        .subscribe({
          next: () => void this.router.navigate(['/usuarios']),
          error: (err) => {
            this.error.set(mensajeErrorApi(err, 'No fue posible actualizar el usuario.'));
            this.loading.set(false);
          },
        });
      return;
    }

    if (!this.correo().trim()) {
      this.error.set('Ingrese el correo electrónico.');
      this.loading.set(false);
      return;
    }

    this.usuarios
      .create({ nombre: this.nombre().trim(), correo: this.correo().trim(), rol: this.rol(), paisId })
      .subscribe({
        next: () => void this.router.navigate(['/usuarios']),
        error: (err) => {
          this.error.set(mensajeErrorApi(err, 'No fue posible crear el usuario.'));
          this.loading.set(false);
        },
      });
  }
}
