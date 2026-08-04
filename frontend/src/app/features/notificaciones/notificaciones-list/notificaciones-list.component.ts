import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificacionesService, Notificacion } from '../../../core/services/notificaciones.service';
import { etiquetaTipoNotificacion } from '../../../core/utils/proyeccion-ui.util';
import { formatFechaHora, formatTiempoRelativo } from '../../../core/utils/date.util';
import { resolverRutaNotificacion } from '../../../core/utils/notificacion-navigation.util';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';

@Component({
  selector: 'app-notificaciones-list',
  standalone: true,
  templateUrl: './notificaciones-list.component.html',
  styleUrl: './notificaciones-list.component.scss',
})
export class NotificacionesListComponent implements OnInit {
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);

  protected readonly items = signal<Notificacion[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly soloNoLeidas = signal(false);

  protected readonly tipoLabel = (tipo: string) => etiquetaTipoNotificacion(tipo);
  protected readonly tiempoRelativo = (fecha: string) => formatTiempoRelativo(fecha);
  protected readonly fechaCompleta = (fecha: string) => formatFechaHora(fecha);

  ngOnInit(): void {
    this.load();
  }

  protected onFilterChange(): void {
    this.load();
  }

  protected marcarTodas(): void {
    this.notificaciones.marcarTodasLeidas().subscribe({
      next: () => this.items.update((list) => list.map((n) => ({ ...n, leida: true }))),
      error: (err) =>
        this.error.set(mensajeErrorApi(err, 'No fue posible marcar las notificaciones.')),
    });
  }

  protected abrir(n: Notificacion): void {
    if (!n.leida) {
      this.notificaciones.marcarLeida(n.id).subscribe({
        next: () =>
          this.items.update((list) =>
            list.map((item) => (item.id === n.id ? { ...item, leida: true } : item)),
          ),
      });
    }

    const ruta = resolverRutaNotificacion(n);
    if (ruta) {
      void this.router.navigate(ruta);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificaciones.list(this.soloNoLeidas()).subscribe({
      next: (r) => {
        this.items.set(r.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.items.set([]);
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar las notificaciones.'));
        this.loading.set(false);
      },
    });
  }
}
