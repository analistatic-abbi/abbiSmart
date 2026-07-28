import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CargaMasivaService, CargaMasivaLog } from '../../../core/services/carga-masiva.service';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';

type Entidad = 'clientes' | 'contactos' | 'proyecciones';

@Component({
  selector: 'app-carga-masiva',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './carga-masiva.component.html',
  styleUrl: './carga-masiva.component.scss',
})
export class CargaMasivaComponent implements OnInit {
  private readonly cargaMasiva = inject(CargaMasivaService);

  protected readonly logs = signal<CargaMasivaLog[]>([]);
  protected readonly entidad = signal<Entidad>('clientes');
  protected readonly archivo = signal<File | null>(null);
  protected readonly resultado = signal<string | null>(null);
  protected readonly erroresDetalle = signal<Array<{ fila: number; error: string }>>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.cargaMasiva.getLogs().subscribe((r) => this.logs.set(r.data));
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  protected subir(): void {
    const file = this.archivo();
    if (!file) return;

    this.loading.set(true);
    this.resultado.set(null);
    this.erroresDetalle.set([]);

    const req =
      this.entidad() === 'clientes'
        ? this.cargaMasiva.importClientes(file)
        : this.entidad() === 'contactos'
          ? this.cargaMasiva.importContactos(file)
          : this.cargaMasiva.importProyecciones(file);

    req.subscribe({
      next: (r) => {
        this.resultado.set(
          `${r.message}: ${r.filasExitosas} exitosas, ${r.filasRechazadas} rechazadas.`,
        );
        this.erroresDetalle.set(r.detalleErrores ?? []);
        this.loading.set(false);
        this.cargaMasiva.getLogs().subscribe((res) => this.logs.set(res.data));
      },
      error: (err) => {
        this.resultado.set(mensajeErrorApi(err, 'Error al procesar el archivo.'));
        this.loading.set(false);
      },
    });
  }
}
