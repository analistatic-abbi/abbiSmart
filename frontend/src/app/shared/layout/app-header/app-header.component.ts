import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService, Notificacion } from '../../../core/services/notificaciones.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LOGO_ABBI } from '../../../core/constants/branding';
import { etiquetaTipoNotificacion } from '../../../core/utils/proyeccion-ui.util';
import { countryFlagUrl, countryIsoCode } from '../../../core/utils/country.util';
import { formatFechaHora, formatTiempoRelativo } from '../../../core/utils/date.util';
import { resolverRutaNotificacion } from '../../../core/utils/notificacion-navigation.util';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly logoUrl = LOGO_ABBI;
  protected readonly notifs = signal<Notificacion[]>([]);
  protected readonly showNotifs = signal(false);
  protected readonly showCountryMenu = signal(false);
  protected readonly changingCountry = signal(false);

  protected readonly paisLabel = () => this.auth.paisNombre() ?? 'País';
  protected readonly paisCodigo = () =>
    countryIsoCode(this.auth.paisNombre(), this.auth.session()?.paisSesionId);
  protected readonly flagUrl = () =>
    countryFlagUrl(this.auth.paisNombre(), this.auth.session()?.paisSesionId);
  protected readonly unreadCount = () => this.notifs().filter((n) => !n.leida).length;
  protected readonly canChangeCountry = () => this.auth.canChangeCountry();
  protected readonly tipoLabel = (tipo: string) => etiquetaTipoNotificacion(tipo);
  protected readonly tiempoRelativo = (fecha: string) => formatTiempoRelativo(fecha);
  protected readonly fechaCompleta = (fecha: string) => formatFechaHora(fecha);

  ngOnInit(): void {
    this.cargarNotificaciones();
    this.refreshTimer = setInterval(() => this.cargarNotificaciones(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected toggleNotifs(): void {
    this.showNotifs.update((v) => !v);
    this.showCountryMenu.set(false);
    if (this.showNotifs()) {
      this.cargarNotificaciones();
    }
  }

  protected toggleCountryMenu(): void {
    if (!this.canChangeCountry()) return;
    this.showCountryMenu.update((v) => !v);
    this.showNotifs.set(false);
  }

  protected cambiarPais(): void {
    this.showCountryMenu.set(false);
    this.changingCountry.set(true);
    this.auth.prepareCountryChange().subscribe({
      next: () => this.changingCountry.set(false),
      error: () => this.changingCountry.set(false),
    });
  }

  protected abrirNotificacion(n: Notificacion): void {
    const ruta = resolverRutaNotificacion(n);
    this.marcarLeida(Number(n.id));

    if (!ruta) {
      return;
    }

    this.showNotifs.set(false);
    void this.router.navigate(ruta);
  }

  protected marcarLeida(id: number): void {
    this.notificaciones.marcarLeida(id).subscribe({
      next: () => {
        this.notifs.update((items) =>
          items.map((n) => (n.id === id ? { ...n, leida: true } : n)),
        );
      },
    });
  }

  protected marcarTodas(): void {
    this.notificaciones.marcarTodasLeidas().subscribe({
      next: () => this.notifs.update((items) => items.map((n) => ({ ...n, leida: true }))),
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe();
  }

  private cargarNotificaciones(): void {
    this.notificaciones.list().subscribe({
      next: (r) => this.notifs.set(r.data),
      error: () => this.notifs.set([]),
    });
  }
}
