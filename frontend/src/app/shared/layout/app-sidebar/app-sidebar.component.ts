import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupportUiService } from '../../../core/services/support-ui.service';
import { Rol } from '../../../core/models/rol.enum';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: Rol[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly supportUi = inject(SupportUiService);

  private readonly allItems: NavItem[] = [
    { label: 'Panel de Control', icon: 'dashboard', route: '/dashboard' },
    { label: 'Calendario', icon: 'calendar_month', route: '/calendario' },
    { label: 'Panel de procesos', icon: 'dashboard', route: '/procesos' },
    {
      label: 'Validación',
      icon: 'fact_check',
      route: '/validacion',
      roles: [Rol.Administrador, Rol.SupervisorSistema, Rol.Validador],
    },
    {
      label: 'Gestión de Usuarios',
      icon: 'group',
      route: '/usuarios',
      roles: [Rol.Administrador],
    },
    { label: 'Clientes', icon: 'business', route: '/crm/clientes' },
    { label: 'Contactos', icon: 'contacts', route: '/crm/contactos' },
    { label: 'Relacionamientos', icon: 'handshake', route: '/crm/relacionamientos' },
    { label: 'Gestión de Proyecciones', icon: 'monitoring', route: '/proyecciones' },
    { label: 'Parámetros', icon: 'tune', route: '/parametros' },
    {
      label: 'Carga masiva',
      icon: 'upload_file',
      route: '/carga-masiva',
      roles: [Rol.Administrador, Rol.SupervisorSistema, Rol.Operador],
    },
    {
      label: 'Solicitudes eliminación',
      icon: 'delete_sweep',
      route: '/admin/solicitudes-eliminacion',
      roles: [Rol.Administrador],
    },
    {
      label: 'Auditoría',
      icon: 'history',
      route: '/admin/auditoria',
      roles: [Rol.Administrador],
    },
  ];

  protected readonly items = computed(() => {
    const rol = this.auth.rol();
    if (!rol) return [];

    return this.allItems.filter((item) => !item.roles || item.roles.includes(rol));
  });

  protected logout(): void {
    this.auth.logout().subscribe();
  }

  protected openSupport(): void {
    this.supportUi.open();
  }
}
