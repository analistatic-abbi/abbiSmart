import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ValidacionService } from '../../../../core/services/validacion.service';
import { ProcesosService } from '../../../../core/services/procesos.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Proceso, ProcesoTarea } from '../../../../core/models/proceso.model';
import { Rol } from '../../../../core/models/rol.enum';
import { labelTarea } from '../../../../core/constants/tarea-labels';
import { formatCuantiaConMoneda } from '../../../../core/utils/currency.util';

@Component({
  selector: 'app-validacion-revision',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './validacion-revision.component.html',
  styleUrl: './validacion-revision.component.scss',
})
export class ValidacionRevisionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly validacion = inject(ValidacionService);
  private readonly procesos = inject(ProcesosService);
  private readonly auth = inject(AuthService);

  protected readonly proceso = signal<Proceso | null>(null);
  protected readonly tareas = signal<ProcesoTarea[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly veredicto = signal<'Aprobado' | 'Requiere Corrección'>('Aprobado');
  protected readonly comentario = signal('');

  protected readonly puedeEmitirVeredicto = computed(
    () => this.auth.rol() === Rol.Validador,
  );

  protected readonly formatCuantia = formatCuantiaConMoneda;

  protected readonly tareasConEvidencia = computed(() =>
    this.tareas().filter(
      (t) =>
        Boolean(t.aplica) &&
        Boolean(t.completada) &&
        (Boolean(t.evidenciaArchivoNombre) || Boolean(t.evidencia?.trim())),
    ),
  );

  protected readonly tareasPendientes = computed(() =>
    this.tareas().filter((t) => Boolean(t.aplica) && !t.completada),
  );

  protected readonly labelTarea = labelTarea;

  private procesoId = 0;
  private validacionId = 0;

  ngOnInit(): void {
    this.procesoId = Number(this.route.snapshot.paramMap.get('id'));
    this.validacionId = Number(this.route.snapshot.queryParamMap.get('validacionId'));

    this.validacion.getRevision(this.procesoId).subscribe({
      next: (r) => {
        this.proceso.set(r.data.proceso);
        this.tareas.set(r.data.tareas ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar la revisión.');
        this.loading.set(false);
      },
    });
  }

  protected estadoTarea(tarea: ProcesoTarea): string {
    if (!tarea.aplica) return 'No aplica';
    return tarea.completada ? 'Completada' : 'Pendiente';
  }

  protected verEvidencia(tarea: ProcesoTarea): void {
    if (!tarea.evidenciaArchivoNombre) return;
    this.procesos.descargarEvidencia(
      this.procesoId,
      tarea.id,
      tarea.evidenciaArchivoNombre,
    );
  }

  protected enviarVeredicto(): void {
    if (!this.validacionId) {
      this.error.set('Falta el ID de validación.');
      return;
    }

    this.saving.set(true);
    this.validacion
      .registrarVeredicto(this.validacionId, this.veredicto(), this.comentario() || undefined)
      .subscribe({
        next: () => void this.router.navigate(['/validacion']),
        error: () => {
          this.error.set('No fue posible registrar el veredicto.');
          this.saving.set(false);
        },
      });
  }
}
