import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { SupportUiService } from '../../../core/services/support-ui.service';
import { Rol } from '../../../core/models/rol.enum';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: Rol[];
}

interface NavSection {
  title: string;
  items: NavItem[];
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
  private readonly catalogos = inject(CatalogosService);
  private readonly supportUi = inject(SupportUiService);
  private readonly router = inject(Router);

  private readonly calificacionPorPuntos = signal(true);

  private readonly allSections: NavSection[] = [
    {
      title: 'Inicio',
      items: [
        { label: 'Panel de Control', icon: 'dashboard', route: '/dashboard' },
        { label: 'Calendario', icon: 'calendar_month', route: '/calendario' },
        { label: 'Procesos', icon: 'assignment', route: '/procesos' },
      ],
    },
    {
      title: 'Operación',
      items: [
        {
          label: 'Validación',
          icon: 'fact_check',
          route: '/validacion',
          roles: [Rol.Administrador, Rol.SupervisorSistema, Rol.Validador],
        },
        { label: 'Mi bandeja', icon: 'inbox', route: '/bandeja-personal' },
        { label: 'Notificaciones', icon: 'notifications', route: '/notificaciones' },
      ],
    },
    {
      title: 'CRM',
      items: [
        { label: 'Clientes', icon: 'business', route: '/crm/clientes' },
        { label: 'Contactos', icon: 'contacts', route: '/crm/contactos' },
        { label: 'Relacionamientos', icon: 'handshake', route: '/crm/relacionamientos' },
      ],
    },
    {
      title: 'KAM',
      items: [
        { label: 'KAM', icon: 'support_agent', route: '/kam' },
        { label: 'Calendario KAM', icon: 'calendar_month', route: '/kam/calendario' },
        {
          label: 'Formatos de encuesta',
          icon: 'quiz',
          route: '/admin/formatos-encuesta',
          roles: [Rol.Administrador, Rol.SupervisorSistema, Rol.Operador],
        },
      ],
    },
    {
      title: 'Planeación',
      items: [
        { label: 'Proyecciones', icon: 'monitoring', route: '/proyecciones' },
        {
          label: 'Asignar mercado',
          icon: 'pie_chart',
          route: '/proyecciones/asignar-mercado',
          roles: [Rol.Administrador, Rol.SupervisorSistema],
        },
        {
          label: 'Efectividad de mercado',
          icon: 'analytics',
          route: '/proyecciones/efectividad-mercado',
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        { label: 'Parámetros', icon: 'tune', route: '/parametros' },
        {
          label: 'Formatos de calificación',
          icon: 'grade',
          route: '/admin/formatos-calificacion',
          roles: [Rol.Administrador],
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        {
          label: 'Usuarios',
          icon: 'group',
          route: '/usuarios',
          roles: [Rol.Administrador],
        },
        {
          label: 'Países',
          icon: 'public',
          route: '/admin/paises',
          roles: [Rol.Administrador],
        },
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
      ],
    },
  ];

  private readonly collapsedSections = signal<Record<string, boolean>>({});

  protected readonly sections = computed(() => {
    const rol = this.auth.rol();
    if (!rol) return [];

    return this.allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (item.route === '/admin/formatos-calificacion' && !this.calificacionPorPuntos()) {
            return false;
          }

          return !item.roles || item.roles.includes(rol);
        }),
      }))
      .filter((section) => section.items.length > 0);
  });

  ngOnInit(): void {
    if (!this.auth.session()?.paisSesionId) {
      return;
    }

    this.catalogos.getCapabilitiesSesion().subscribe({
      next: (response) =>
        this.calificacionPorPuntos.set(response.data.calificacionPorPuntos),
      error: () => this.calificacionPorPuntos.set(false),
    });
  }

  protected isSectionCollapsed(title: string): boolean {
    const manual = this.collapsedSections()[title];
    if (manual !== undefined) return manual;

    const section = this.sections().find((item) => item.title === title);
    if (section && this.sectionHasActiveRoute(section)) {
      return false;
    }

    return true;
  }

  protected toggleSection(title: string): void {
    this.collapsedSections.update((state) => ({
      ...state,
      [title]: !this.isSectionCollapsed(title),
    }));
  }

  protected sectionHasActiveRoute(section: NavSection): boolean {
    const url = this.router.url.split('?')[0];
    return section.items.some((item) => {
      if (item.route === '/dashboard') {
        return url === '/dashboard';
      }
      return url === item.route || url.startsWith(`${item.route}/`);
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe();
  }

  protected openSupport(): void {
    this.supportUi.open();
  }
}
