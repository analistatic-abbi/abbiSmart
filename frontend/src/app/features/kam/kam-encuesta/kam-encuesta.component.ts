import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KamService } from '../../../core/services/kam.service';
import { FormatosEncuestaService } from '../../../core/services/formatos-encuesta.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  EstadoKamRonda,
  GuardarRespuestasPayload,
  KamEncuesta,
  KamRonda,
  ResumenEncuesta,
} from '../../../core/models/kam.model';
import {
  FormatoEncuestaDetail,
  FormatoEncuestaItem,
  FormatoEncuestaPregunta,
  FormatoEncuestaSeccion,
} from '../../../core/models/formato-encuesta.model';
import { mensajeErrorApi, mensajeExitoApi } from '../../../core/utils/api-error.util';
import { ToastService } from '../../../core/services/toast.service';
import { claseBadgeEstadoKamRonda } from '../../../core/utils/kam-ui.util';

interface RespuestaState {
  puntaje: number | null;
  observacion: string;
}

@Component({
  selector: 'app-kam-encuesta',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './kam-encuesta.component.html',
  styleUrl: './kam-encuesta.component.scss',
})
export class KamEncuestaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly kamService = inject(KamService);
  private readonly formatosService = inject(FormatosEncuestaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savingVeredicto = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formato = signal<FormatoEncuestaDetail | null>(null);
  protected readonly ronda = signal<KamRonda | null>(null);
  protected readonly encuesta = signal<KamEncuesta | null>(null);
  protected readonly procesoCodigo = signal<string | null>(null);
  protected readonly empresaMostrar = signal('');
  protected readonly respuestas = signal<Record<number, RespuestaState>>({});
  protected readonly veredictoDraft = signal('');

  protected readonly puedeEscribir = () => this.auth.puedeEscribir();
  protected readonly estados = EstadoKamRonda;
  protected readonly badgeClass = (estado: string) => claseBadgeEstadoKamRonda(estado);

  protected estadoEncuestaClass(completo: boolean): string {
    return completo ? 'badge badge--encuesta-completa' : 'badge badge--encuesta-pendiente';
  }

  protected readonly contacto = computed(() => this.encuesta()?.contactos[0] ?? null);

  protected readonly puedeEditar = computed(() => {
    const r = this.ronda();
    return this.puedeEscribir() && r?.estado === EstadoKamRonda.Pendiente;
  });

  protected readonly secciones = computed((): FormatoEncuestaSeccion[] => {
    return this.formato()?.secciones ?? [];
  });

  protected readonly resumen = computed((): ResumenEncuesta | null => {
    return this.encuesta()?.resumen ?? this.contacto()?.resumen ?? null;
  });

  protected kamId = 0;
  protected rondaId = 0;
  protected encuestaId = 0;

  ngOnInit(): void {
    this.kamId = Number(this.route.snapshot.paramMap.get('kamId'));
    this.rondaId = Number(this.route.snapshot.paramMap.get('rondaId'));
    this.encuestaId = Number(this.route.snapshot.paramMap.get('encuestaId'));
    this.cargar();
  }

  protected getPuntaje(itemId: number): number | null {
    return this.respuestas()[itemId]?.puntaje ?? null;
  }

  protected setPuntaje(itemId: number, puntaje: number): void {
    this.respuestas.update((state) => ({
      ...state,
      [itemId]: {
        puntaje,
        observacion: state[itemId]?.observacion ?? '',
      },
    }));
  }

  protected getObservacion(itemId: number): string {
    return this.respuestas()[itemId]?.observacion ?? '';
  }

  protected setObservacion(itemId: number, observacion: string): void {
    this.respuestas.update((state) => ({
      ...state,
      [itemId]: {
        puntaje: state[itemId]?.puntaje ?? null,
        observacion,
      },
    }));
  }

  protected itemsDePregunta(pregunta: FormatoEncuestaPregunta): FormatoEncuestaItem[] {
    return pregunta.items ?? [];
  }

  protected formatPorcentaje(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${Math.round(value)}%`;
  }

  protected guardar(): void {
    const encuesta = this.encuesta();
    const formato = this.formato();
    const contacto = this.contacto();

    if (!encuesta || !formato || !contacto) return;

    const respuestasState = this.respuestas();
    const items = this.flattenItems(formato.secciones ?? []);
    const payload: GuardarRespuestasPayload = {
      contactoId: contacto.contactoId,
      respuestas: items.map((item) => {
        const state = respuestasState[item.id];
        return {
          itemId: item.id,
          puntaje: item.requiereCalificacion ? (state?.puntaje ?? 3) : undefined,
          observacion: state?.observacion || undefined,
        };
      }),
    };

    this.saving.set(true);
    this.kamService.guardarRespuestas(this.kamId, this.rondaId, encuesta.id, payload).subscribe({
      next: (res) => {
        this.toast.success(mensajeExitoApi(res, res.message));
        this.saving.set(false);
        this.cargar();
      },
      error: (err) => {
        this.toast.error(mensajeErrorApi(err, 'No fue posible guardar las respuestas.'));
        this.saving.set(false);
      },
    });
  }

  protected guardarVeredicto(): void {
    const encuesta = this.encuesta();
    const texto = this.veredictoDraft().trim();
    if (!encuesta || !texto) {
      this.toast.error('Indique el veredicto.');
      return;
    }

    this.savingVeredicto.set(true);
    this.kamService
      .updateVeredictoEncuesta(this.kamId, this.rondaId, encuesta.id, { veredicto: texto })
      .subscribe({
        next: (res) => {
          this.toast.success(mensajeExitoApi(res, res.message));
          this.savingVeredicto.set(false);
          this.encuesta.set(res.data);
          this.veredictoDraft.set(res.data.veredicto ?? '');
        },
        error: (err) => {
          this.toast.error(mensajeErrorApi(err, 'No fue posible guardar el veredicto.'));
          this.savingVeredicto.set(false);
        },
      });
  }

  private cargar(): void {
    this.loading.set(true);
    this.kamService.getById(this.kamId).subscribe({
      next: (res) => {
        const kam = res.data;
        const ronda =
          kam.rondas.find((item) => Number(item.id) === this.rondaId) ?? null;
        const encuesta =
          ronda?.encuestas.find((item) => Number(item.id) === this.encuestaId) ?? null;

        if (!ronda || !encuesta) {
          this.error.set('Encuesta no encontrada.');
          this.loading.set(false);
          return;
        }

        this.ronda.set(ronda);
        this.encuesta.set(encuesta);
        this.veredictoDraft.set(encuesta.veredicto ?? '');
        this.procesoCodigo.set(kam.procesoCodigo);
        this.empresaMostrar.set(kam.empresaMostrar);

        this.formatosService.getById(encuesta.formatoEncuestaId).subscribe({
          next: (formatoRes) => {
            this.formato.set(formatoRes.data);
            this.inicializarRespuestas(encuesta, formatoRes.data);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(mensajeErrorApi(err, 'No fue posible cargar el formato de encuesta.'));
            this.loading.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(mensajeErrorApi(err, 'No fue posible cargar el KAM.'));
        this.loading.set(false);
      },
    });
  }

  private inicializarRespuestas(encuesta: KamEncuesta, formato: FormatoEncuestaDetail): void {
    const contacto = encuesta.contactos[0];
    const map: Record<number, RespuestaState> = {};
    const items = this.flattenItems(formato.secciones ?? []);

    for (const item of items) {
      const existente = contacto?.respuestas.find(
        (r) => Number(r.itemId) === item.id || Number(r.preguntaId) === item.id,
      );
      map[item.id] = {
        puntaje: existente?.puntaje ?? (item.requiereCalificacion ? 3 : null),
        observacion: existente?.observacion ?? '',
      };
    }

    this.respuestas.set(map);
  }

  private flattenItems(secciones: FormatoEncuestaSeccion[]): FormatoEncuestaItem[] {
    return secciones.flatMap((seccion) =>
      seccion.preguntas.flatMap((pregunta) => pregunta.items ?? []),
    );
  }
}
