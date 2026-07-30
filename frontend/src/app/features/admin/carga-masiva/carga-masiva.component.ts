import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CargaMasivaService, CargaMasivaLog } from '../../../core/services/carga-masiva.service';
import { mensajeErrorApi } from '../../../core/utils/api-error.util';

type Entidad = 'clientes' | 'contactos' | 'proyecciones';

interface ColumnaGuia {
  nombre: string;
  obligatoria: boolean;
  descripcion: string;
}

interface GuiaCargaMasiva {
  titulo: string;
  intro: string;
  encabezado: string;
  columnas: ColumnaGuia[];
  notas: string[];
}

const GUIAS_CARGA_MASIVA: Record<Entidad, GuiaCargaMasiva> = {
  clientes: {
    titulo: 'Clientes',
    intro:
      'Use siempre el mismo conjunto de columnas en la primera fila. Las columnas opcionales pueden dejarse vacías en cada fila.',
    encabezado: 'empresa, segmento, pais, departamento, municipio, segmento_otro',
    columnas: [
      { nombre: 'empresa', obligatoria: true, descripcion: 'Nombre de la empresa cliente.' },
      {
        nombre: 'segmento',
        obligatoria: true,
        descripcion: 'Valor del catálogo (ej. Gas Natural, Minería, Construcción, Otro).',
      },
      {
        nombre: 'pais',
        obligatoria: false,
        descripcion: 'Solo si necesita validar el país; debe coincidir con su sesión. Vacío = país de sesión.',
      },
      {
        nombre: 'departamento',
        obligatoria: false,
        descripcion: 'Departamento o región. También acepta la columna region. Vacío = ubicación genérica del país.',
      },
      {
        nombre: 'municipio',
        obligatoria: false,
        descripcion: 'Municipio o ciudad para precisar la ubicación.',
      },
      {
        nombre: 'segmento_otro',
        obligatoria: false,
        descripcion: 'Texto libre solo si segmento es Otro.',
      },
    ],
    notas: [
      'Ejemplo con solo país: empresa y segmento obligatorios; pais con valor; departamento y municipio vacíos.',
    ],
  },
  contactos: {
    titulo: 'Contactos',
    intro:
      'Use siempre el mismo conjunto de columnas en la primera fila. Cada fila es un contacto de un cliente ya registrado.',
    encabezado:
      'empresa, nombre, departamento, municipio, cargo, telefono, correo, referido_por',
    columnas: [
      { nombre: 'empresa', obligatoria: true, descripcion: 'Debe coincidir con un cliente existente.' },
      { nombre: 'nombre', obligatoria: true, descripcion: 'Nombre completo del contacto.' },
      {
        nombre: 'departamento',
        obligatoria: false,
        descripcion: 'Departamento o región. También acepta region. Vacío = ubicación genérica del país.',
      },
      { nombre: 'municipio', obligatoria: false, descripcion: 'Municipio o ciudad del contacto.' },
      { nombre: 'cargo', obligatoria: false, descripcion: 'Cargo del contacto.' },
      { nombre: 'telefono', obligatoria: false, descripcion: 'Teléfono de contacto.' },
      { nombre: 'correo', obligatoria: false, descripcion: 'Correo electrónico.' },
      {
        nombre: 'referido_por',
        obligatoria: false,
        descripcion: 'Nombre de otro contacto del mismo cliente que lo refirió.',
      },
    ],
    notas: [],
  },
  proyecciones: {
    titulo: 'Proyecciones',
    intro:
      'Use siempre el mismo conjunto de columnas en la primera fila. Cada fila siguiente es una proyección.',
    encabezado:
      'anio_proyectado, fecha_estimada_publicacion, valor_venta, valor_facturacion, proceso_codigo, mercado',
    columnas: [
      { nombre: 'anio_proyectado', obligatoria: true, descripcion: 'Año en que se proyecta la oportunidad.' },
      {
        nombre: 'fecha_estimada_publicacion',
        obligatoria: true,
        descripcion: 'Fecha estimada de publicación (AAAA-MM-DD).',
      },
      { nombre: 'valor_venta', obligatoria: true, descripcion: 'Valor estimado de venta (número, sin símbolos).' },
      {
        nombre: 'valor_facturacion',
        obligatoria: true,
        descripcion: 'Valor estimado de facturación (número, sin símbolos).',
      },
      {
        nombre: 'proceso_codigo',
        obligatoria: false,
        descripcion: 'Código del proceso de origen, si aplica.',
      },
      { nombre: 'mercado', obligatoria: false, descripcion: 'General u Objetivo.' },
    ],
    notas: [],
  },
};

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

  protected readonly guia = computed(() => GUIAS_CARGA_MASIVA[this.entidad()]);

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
