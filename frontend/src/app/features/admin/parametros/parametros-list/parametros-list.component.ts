import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ParametrosService, ParametroFinanciero, ParametroHistorial } from '../../../../core/services/parametros.service';
import { INDICADORES_ORDEN, IndicadorCodigo } from '../../../../core/models/proceso.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Rol } from '../../../../core/models/rol.enum';
import { formatParametroValor, indicadorValorHint } from '../../../../core/utils/parametro.util';
import { formatFechaHora } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-parametros-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './parametros-list.component.html',
  styleUrl: './parametros-list.component.scss',
})
export class ParametrosListComponent implements OnInit {
  private readonly parametros = inject(ParametrosService);
  private readonly auth = inject(AuthService);

  protected readonly items = signal<ParametroFinanciero[]>([]);
  protected readonly loading = signal(true);
  protected readonly indicadores = INDICADORES_ORDEN;
  protected readonly reglas = ['Mayor o igual al requerido', 'Menor o igual al requerido'];
  protected readonly puedeEditar = () => this.auth.rol() === Rol.Administrador;

  protected readonly search = signal('');
  protected readonly filtroIndicador = signal<IndicadorCodigo | ''>('');
  protected readonly filtroAnio = signal<number | ''>('');

  protected readonly showForm = signal(false);
  protected readonly showEdit = signal(false);
  protected readonly showHistorial = signal(false);
  protected readonly showEliminar = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly historialItems = signal<ParametroHistorial[]>([]);
  protected readonly historialIndicador = signal<IndicadorCodigo | null>(null);
  protected readonly editingIndicador = signal<IndicadorCodigo | null>(null);
  protected readonly eliminarTarget = signal<ParametroFinanciero | null>(null);
  protected readonly editingId = signal(0);

  protected readonly indicadorCodigo = signal<IndicadorCodigo>(IndicadorCodigo.KTNO);
  protected readonly anio = signal(new Date().getFullYear());
  protected readonly valor = signal(0);
  protected readonly reglaCumplimiento = signal('Mayor o igual al requerido');
  protected readonly formatValor = formatParametroValor;
  protected readonly valorHint = indicadorValorHint;
  protected readonly formatFecha = formatFechaHora;

  protected esReglaMenor(regla: string): boolean {
    return regla.toLowerCase().includes('menor');
  }

  protected formatHistorialValor(campo: string | null, valor: string | null): string {
    if (!valor) return '—';
    const indicador = this.historialIndicador();
    if (campo === 'valor' && indicador) return formatParametroValor(indicador, valor);
    return valor;
  }

  ngOnInit(): void {
    this.load();
  }

  protected onFilter(): void {
    this.load();
  }

  protected abrirCrear(): void {
    this.showForm.set(true);
  }

  protected abrirEditar(p: ParametroFinanciero): void {
    this.editingId.set(p.id);
    this.editingIndicador.set(p.indicadorCodigo);
    this.valor.set(Number(p.valor));
    this.reglaCumplimiento.set(p.reglaCumplimiento);
    this.showEdit.set(true);
  }

  protected abrirHistorial(p: ParametroFinanciero): void {
    this.historialIndicador.set(p.indicadorCodigo);
    this.parametros.getHistorial(p.id).subscribe({
      next: (r) => {
        this.historialItems.set(r.data);
        this.showHistorial.set(true);
      },
    });
  }

  protected abrirEliminar(p: ParametroFinanciero): void {
    this.eliminarTarget.set(p);
    this.error.set(null);
    this.showEliminar.set(true);
  }

  protected confirmarEliminacion(): void {
    const target = this.eliminarTarget();
    if (!target) return;

    this.eliminando.set(true);
    this.error.set(null);
    this.parametros.delete(target.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.showEliminar.set(false);
        this.eliminarTarget.set(null);
        this.load();
      },
      error: () => {
        this.eliminando.set(false);
        this.error.set('No fue posible eliminar el parámetro.');
      },
    });
  }

  protected crear(): void {
    this.parametros
      .create({
        indicadorCodigo: this.indicadorCodigo(),
        anio: this.anio(),
        valor: this.valor(),
        reglaCumplimiento: this.reglaCumplimiento(),
      })
      .subscribe({
        next: () => {
          this.showForm.set(false);
          this.load();
        },
      });
  }

  protected guardarEdicion(): void {
    this.parametros
      .update(this.editingId(), {
        valor: this.valor(),
        reglaCumplimiento: this.reglaCumplimiento(),
      })
      .subscribe({
        next: () => {
          this.showEdit.set(false);
          this.load();
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.parametros
      .list({
        limit: 50,
        search: this.search() || undefined,
        indicadorCodigo: this.filtroIndicador() || undefined,
        anio: this.filtroAnio() ? Number(this.filtroAnio()) : undefined,
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
