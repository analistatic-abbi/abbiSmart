import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { Usuario } from '../../../../core/models/admin.model';
import { Rol } from '../../../../core/models/rol.enum';

type AccionUsuario = 'reset' | 'reenviar' | 'desbloquear' | 'desactivar';

interface ConfirmacionAccion {
  accion: AccionUsuario;
  usuario: Usuario;
}

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);
  private readonly catalogos = inject(CatalogosService);

  protected readonly items = signal<Usuario[]>([]);
  protected readonly paises = signal<Array<{ id: number; nombre: string }>>([]);
  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly search = signal('');
  protected readonly roles = Object.values(Rol);
  protected readonly rol = signal<Rol | ''>('');
  protected readonly paisId = signal<number | ''>('');
  protected readonly confirmacion = signal<ConfirmacionAccion | null>(null);
  protected readonly feedback = signal<string | null>(null);
  protected readonly menuAbiertoId = signal<number | null>(null);

  @HostListener('document:click')
  protected cerrarMenu(): void {
    this.menuAbiertoId.set(null);
  }

  ngOnInit(): void {
    this.catalogos.getPaises().subscribe((r) => {
      this.paises.set(
        r.data.map((p) => ({ id: Number(p.id), nombre: p.nombre })),
      );
    });
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected paisNombre(usuario: Usuario): string {
    if (usuario.paisNombre) {
      return usuario.paisNombre;
    }

    const id = usuario.paisId;
    if (id == null) {
      return '—';
    }

    return this.paises().find((p) => Number(p.id) === Number(id))?.nombre ?? `ID ${id}`;
  }

  protected toggleMenu(usuarioId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId.set(this.menuAbiertoId() === usuarioId ? null : usuarioId);
  }

  protected menuAbierto(usuarioId: number): boolean {
    return this.menuAbiertoId() === usuarioId;
  }

  protected solicitarConfirmacion(accion: AccionUsuario, usuario: Usuario): void {
    this.menuAbiertoId.set(null);
    this.feedback.set(null);
    this.confirmacion.set({ accion, usuario });
  }

  protected cancelarConfirmacion(): void {
    if (this.actionLoading()) {
      return;
    }
    this.confirmacion.set(null);
  }

  protected confirmarAccion(): void {
    const pending = this.confirmacion();
    if (!pending || this.actionLoading()) {
      return;
    }

    this.actionLoading.set(true);
    const { accion, usuario } = pending;
    const onDone = (message: string, reload = false): void => {
      this.actionLoading.set(false);
      this.confirmacion.set(null);
      this.feedback.set(message);
      if (reload) {
        this.load();
      }
    };
    const onError = (message: string): void => {
      this.actionLoading.set(false);
      this.feedback.set(message);
    };

    switch (accion) {
      case 'reset':
        this.usuarios.resetPassword(usuario.id).subscribe({
          next: (r) => onDone(r.message || `Correo de restablecimiento enviado a ${usuario.correo}.`),
          error: () => onError('No fue posible enviar el correo de restablecimiento.'),
        });
        break;
      case 'reenviar':
        this.usuarios.reenviarActivacion(usuario.id).subscribe({
          next: (r) => onDone(r.message || `Correo de activación enviado a ${usuario.correo}.`),
          error: () => onError('No fue posible reenviar el correo de activación.'),
        });
        break;
      case 'desbloquear':
        this.usuarios.desbloquear(usuario.id).subscribe({
          next: (r) =>
            onDone(
              r.message || `Cuenta desbloqueada. Se envió activación a ${usuario.correo}.`,
              true,
            ),
          error: () => onError('No fue posible desbloquear la cuenta.'),
        });
        break;
      case 'desactivar':
        this.usuarios.desactivar(usuario.id).subscribe({
          next: () => onDone(`Usuario ${usuario.nombre} desactivado.`, true),
          error: () => onError('No fue posible desactivar el usuario.'),
        });
        break;
    }
  }

  protected tituloConfirmacion(): string {
    const pending = this.confirmacion();
    if (!pending) {
      return '';
    }

    switch (pending.accion) {
      case 'reset':
        return 'Restablecer contraseña';
      case 'reenviar':
        return 'Reenviar activación';
      case 'desbloquear':
        return 'Desbloquear cuenta';
      case 'desactivar':
        return 'Desactivar usuario';
    }
  }

  protected mensajeConfirmacion(): string {
    const pending = this.confirmacion();
    if (!pending) {
      return '';
    }

    const { accion, usuario } = pending;

    switch (accion) {
      case 'reset':
        return `Se enviará un correo a ${usuario.correo} con un enlace para restablecer la contraseña. ¿Desea continuar?`;
      case 'reenviar':
        return `Se enviará un nuevo correo de activación a ${usuario.correo}. ¿Desea continuar?`;
      case 'desbloquear':
        return `Se desbloqueará la cuenta de ${usuario.nombre} y se enviará un correo de activación a ${usuario.correo}. ¿Desea continuar?`;
      case 'desactivar':
        return `El usuario ${usuario.nombre} (${usuario.correo}) quedará inactivo. ¿Desea continuar?`;
    }
  }

  protected etiquetaConfirmar(): string {
    const pending = this.confirmacion();
    if (!pending) {
      return 'Confirmar';
    }

    if (pending.accion === 'desactivar') {
      return 'Desactivar';
    }

    return 'Enviar correo';
  }

  private load(): void {
    this.loading.set(true);
    this.usuarios
      .list({
        search: this.search() || undefined,
        rol: this.rol() || undefined,
        paisId: this.paisId() ? Number(this.paisId()) : undefined,
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
