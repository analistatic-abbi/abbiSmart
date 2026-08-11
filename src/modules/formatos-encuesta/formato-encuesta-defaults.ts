import { FormatoEncuestaSeccionInputDto } from './dto/formato-encuesta.dto';

const SUBS = ['Disponibilidad', 'Capacidad de respuesta', 'Capacidad de resolución'];

function preguntaSimple(orden: number, texto: string): FormatoEncuestaSeccionInputDto['preguntas'][0] {
  return {
    orden,
    texto,
    items: [{ orden: 1, subseccion: null, requiereCalificacion: true }],
  };
}

function preguntaConSubsecciones(
  orden: number,
  texto: string,
): FormatoEncuestaSeccionInputDto['preguntas'][0] {
  return {
    orden,
    texto,
    items: SUBS.map((subseccion, index) => ({
      orden: index + 1,
      subseccion,
      requiereCalificacion: true,
    })),
  };
}

function preguntaObservacion(
  orden: number,
  texto: string,
): FormatoEncuestaSeccionInputDto['preguntas'][0] {
  return {
    orden,
    texto,
    items: [{ orden: 1, subseccion: null, requiereCalificacion: false }],
  };
}

/** Default OBRA / GC-FM-027 — editable por el usuario */
export function getDefaultSeccionesFormatoEncuesta(): FormatoEncuestaSeccionInputDto[] {
  return [
    {
      orden: 1,
      titulo: 'Sección I: Evaluación del servicio',
      preguntas: [
        preguntaSimple(1, '¿Cómo calificarías el cumplimiento de ANS?'),
        preguntaSimple(
          2,
          '¿En qué medida se ha cumplido en el periodo las metas operativas establecidas para el proyecto?',
        ),
        preguntaSimple(3, '¿Cómo calificaría la gestión de PQR´s brindada por ABBI?'),
      ],
    },
    {
      orden: 2,
      titulo: 'Sección II: Calidad de la comunicación',
      preguntas: [
        preguntaConSubsecciones(1, '¿Cómo calificarías la comunicación con el jefe de proyecto?'),
        preguntaConSubsecciones(2, '¿Cómo calificarías la comunicación con el jefe de operaciones?'),
        preguntaConSubsecciones(3, '¿Cómo calificarías la comunicación con el área de HSEQ?'),
        preguntaConSubsecciones(4, '¿Cómo calificarías la comunicación con el área contable?'),
      ],
    },
    {
      orden: 3,
      titulo: 'Sección III: Ejecución técnica del contrato',
      preguntas: [
        preguntaSimple(
          1,
          '¿Cómo califica el cumplimiento de condiciones técnicas establecidas para el contrato?',
        ),
        preguntaSimple(
          2,
          '¿Qué tan adecuada ha sido la planeación y secuencia de actividades frente al cronograma?',
        ),
        preguntaSimple(
          3,
          '¿Qué tan bien se han manejado cambios, interferencias o imprevistos técnicos?',
        ),
        preguntaSimple(
          4,
          '¿Cómo valora la coordinación de recursos, personal y equipos durante la ejecución?',
        ),
        preguntaSimple(
          5,
          '¿Cómo evalúa el cierre técnico de los frentes de trabajo y la entrega de soportes?',
        ),
      ],
    },
    {
      orden: 4,
      titulo: 'Sección IV: Valor agregado y proyección de mejora',
      preguntas: [
        preguntaObservacion(1, '¿Qué tan útil ha sido ABBI para anticipar necesidades o prevenir problemas?'),
        preguntaObservacion(
          2,
          '¿Qué oportunidades identifica para mejorar el contrato en tiempos, costos, riesgos o cumplimiento de requisitos técnicos?',
        ),
        preguntaObservacion(3, '¿Qué iniciativa adicional podría generar más valor para su operación?'),
        preguntaObservacion(
          4,
          '¿Qué debería mantenerse y qué debería ajustarse para fortalecer la relación?',
        ),
        preguntaObservacion(5, '¿Qué debería eliminarse para fortalecer la relación?'),
        preguntaObservacion(
          6,
          '¿Qué tema considera prioritario para revisar en el siguiente espacio de relacionamiento?',
        ),
      ],
    },
  ];
}
