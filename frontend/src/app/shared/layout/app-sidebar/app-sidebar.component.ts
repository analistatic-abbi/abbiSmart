import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { SupportUiService } from '../../../core/services/support-ui.service';
import { Rol } from '../../../core/models/rol.enum';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: Rol[];
  requiresCargaMasiva?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
})
export class AppSidebarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly supportUi = inject(SupportUiService);

  private readonly cargaMasivaHabilitada = signal(true);

  private readonly allItems: NavItem[] = [
    { label: 'Panel de Control', icon: 'dashboard', route: '/dashboard' },
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
      requiresCargaMasiva: true,
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
    {
      label: 'Configuración',
      icon: 'settings',
      route: '/configuracion',
      roles: [Rol.Administrador],
    },
  ];

  protected readonly items = computed(() => {
    const rol = this.auth.rol();
    if (!rol) return [];

    return this.allItems.filter((item) => {
      if (item.roles && !item.roles.includes(rol)) return false;
      if (item.requiresCargaMasiva && !this.cargaMasivaHabilitada()) return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.configuracion.list().subscribe({
      next: (r) => {
        const habilitada =
          r.data.find((item) => item.clave === 'carga_masiva_habilitada')?.valor === 'true';
        this.cargaMasivaHabilitada.set(habilitada);
      },
      error: () => this.cargaMasivaHabilitada.set(false),
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe();
  }

  protected openSupport(): void {
    this.supportUi.open();
  }
}
