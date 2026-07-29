import { Routes } from '@angular/router';
import { authGuard, guestGuard, paisSesionGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { writeAccessGuard } from './core/guards/write-access.guard';
import { cargaMasivaGuard } from './core/guards/carga-masiva.guard';
import { Rol } from './core/models/rol.enum';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'select-country',
    loadComponent: () =>
      import('./features/auth/select-country/select-country.component').then(
        (m) => m.SelectCountryComponent,
      ),
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./features/auth/activate-account/activate-account.component').then(
        (m) => m.ActivateAccountComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard, paisSesionGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario-unificado.component').then(
            (m) => m.CalendarioUnificadoComponent,
          ),
      },
      {
        path: 'procesos',
        loadComponent: () =>
          import('./features/procesos/procesos-list/procesos-list.component').then(
            (m) => m.ProcesosListComponent,
          ),
      },
      {
        path: 'procesos/nuevo',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/procesos/proceso-create/proceso-create.component').then(
            (m) => m.ProcesoCreateComponent,
          ),
      },
      {
        path: 'procesos/:id',
        loadComponent: () =>
          import('./features/procesos/proceso-detail/proceso-detail.component').then(
            (m) => m.ProcesoDetailComponent,
          ),
      },
      {
        path: 'validacion',
        canActivate: [roleGuard([Rol.Administrador, Rol.SupervisorSistema, Rol.Validador])],
        loadComponent: () =>
          import('./features/admin/validacion/validacion-list/validacion-list.component').then(
            (m) => m.ValidacionListComponent,
          ),
      },
      {
        path: 'validacion/procesos/:id',
        canActivate: [roleGuard([Rol.Administrador, Rol.SupervisorSistema, Rol.Validador])],
        loadComponent: () =>
          import('./features/admin/validacion/validacion-revision/validacion-revision.component').then(
            (m) => m.ValidacionRevisionComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/usuarios/usuarios-list/usuarios-list.component').then(
            (m) => m.UsuariosListComponent,
          ),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/usuarios/usuario-form/usuario-form.component').then(
            (m) => m.UsuarioFormComponent,
          ),
      },
      {
        path: 'usuarios/:id/editar',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/usuarios/usuario-form/usuario-form.component').then(
            (m) => m.UsuarioFormComponent,
          ),
      },
      {
        path: 'crm/clientes',
        loadComponent: () =>
          import('./features/crm/clientes/clientes-list/clientes-list.component').then(
            (m) => m.ClientesListComponent,
          ),
      },
      {
        path: 'crm/clientes/nuevo',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/crm/clientes/cliente-form/cliente-form.component').then(
            (m) => m.ClienteFormComponent,
          ),
      },
      {
        path: 'crm/clientes/:id/editar',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/crm/clientes/cliente-form/cliente-form.component').then(
            (m) => m.ClienteFormComponent,
          ),
      },
      {
        path: 'crm/clientes/:id',
        loadComponent: () =>
          import('./features/crm/clientes/cliente-detail/cliente-detail.component').then(
            (m) => m.ClienteDetailComponent,
          ),
      },
      {
        path: 'crm/contactos',
        loadComponent: () =>
          import('./features/crm/contactos/contactos-list/contactos-list.component').then(
            (m) => m.ContactosListComponent,
          ),
      },
      {
        path: 'crm/contactos/nuevo',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/crm/contactos/contacto-form/contacto-form.component').then(
            (m) => m.ContactoFormComponent,
          ),
      },
      {
        path: 'crm/contactos/:id/editar',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/crm/contactos/contacto-form/contacto-form.component').then(
            (m) => m.ContactoFormComponent,
          ),
      },
      {
        path: 'crm/relacionamientos',
        loadComponent: () =>
          import('./features/crm/relacionamientos/relacionamientos-list/relacionamientos-list.component').then(
            (m) => m.RelacionamientosListComponent,
          ),
      },
      {
        path: 'crm/relacionamientos/nuevo',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/crm/relacionamientos/relacionamiento-form/relacionamiento-form.component').then(
            (m) => m.RelacionamientoFormComponent,
          ),
      },
      {
        path: 'crm/relacionamientos/:id',
        loadComponent: () =>
          import('./features/crm/relacionamientos/relacionamiento-detail/relacionamiento-detail.component').then(
            (m) => m.RelacionamientoDetailComponent,
          ),
      },
      {
        path: 'proyecciones',
        loadComponent: () =>
          import('./features/admin/proyecciones/proyecciones-list/proyecciones-list.component').then(
            (m) => m.ProyeccionesListComponent,
          ),
      },
      {
        path: 'proyecciones/nuevo',
        canActivate: [writeAccessGuard],
        loadComponent: () =>
          import('./features/admin/proyecciones/proyeccion-form/proyeccion-form.component').then(
            (m) => m.ProyeccionFormComponent,
          ),
      },
      {
        path: 'proyecciones/calendario',
        loadComponent: () =>
          import('./features/admin/proyecciones/calendario-proyecciones/calendario-proyecciones.component').then(
            (m) => m.CalendarioProyeccionesComponent,
          ),
      },
      {
        path: 'proyecciones/asignar-mercado',
        canActivate: [roleGuard([Rol.Administrador, Rol.SupervisorSistema])],
        loadComponent: () =>
          import('./features/admin/proyecciones/asignar-mercado/asignar-mercado.component').then(
            (m) => m.AsignarMercadoComponent,
          ),
      },
      {
        path: 'proyecciones/efectividad-mercado',
        loadComponent: () =>
          import('./features/admin/proyecciones/efectividad-mercado/efectividad-mercado.component').then(
            (m) => m.EfectividadMercadoComponent,
          ),
      },
      {
        path: 'proyecciones/:id',
        loadComponent: () =>
          import('./features/admin/proyecciones/proyeccion-detail/proyeccion-detail.component').then(
            (m) => m.ProyeccionDetailComponent,
          ),
      },
      {
        path: 'configuracion',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/configuracion/configuracion.component').then(
            (m) => m.ConfiguracionComponent,
          ),
      },
      {
        path: 'admin/solicitudes-eliminacion',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/solicitudes/solicitudes-eliminacion-list/solicitudes-eliminacion-list.component').then(
            (m) => m.SolicitudesEliminacionListComponent,
          ),
      },
      {
        path: 'parametros',
        loadComponent: () =>
          import('./features/admin/parametros/parametros-list/parametros-list.component').then(
            (m) => m.ParametrosListComponent,
          ),
      },
      {
        path: 'carga-masiva',
        canActivate: [cargaMasivaGuard],
        loadComponent: () =>
          import('./features/admin/carga-masiva/carga-masiva.component').then(
            (m) => m.CargaMasivaComponent,
          ),
      },
      {
        path: 'admin/auditoria',
        canActivate: [roleGuard([Rol.Administrador])],
        loadComponent: () =>
          import('./features/admin/auditoria/auditoria-list/auditoria-list.component').then(
            (m) => m.AuditoriaListComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
