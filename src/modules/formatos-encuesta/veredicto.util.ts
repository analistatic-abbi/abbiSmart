export const VEREDICTO_UMBRAL_FAVORABLE = 85;
export const VEREDICTO_UMBRAL_ACEPTABLE = 70;

export type CategoriaVeredicto = 'Favorable' | 'Aceptable' | 'Requiere atención' | 'N/A';

export interface ResumenSeccion {
  seccionId: number;
  orden: number;
  titulo: string;
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentaje: number | null;
  etiqueta: string;
}

export interface ResumenEncuesta {
  secciones: ResumenSeccion[];
  puntosObtenidos: number;
  puntosPosibles: number;
  porcentajeGlobal: number | null;
  categoria: CategoriaVeredicto;
  veredictoSugerido: string;
}

export function categoriaDesdePorcentaje(porcentaje: number | null): CategoriaVeredicto {
  if (porcentaje === null) return 'N/A';
  if (porcentaje >= VEREDICTO_UMBRAL_FAVORABLE) return 'Favorable';
  if (porcentaje >= VEREDICTO_UMBRAL_ACEPTABLE) return 'Aceptable';
  return 'Requiere atención';
}

export function textoVeredictoSugerido(categoria: CategoriaVeredicto): string {
  switch (categoria) {
    case 'Favorable':
      return (
        'Resultado general favorable. Se evidencia un alto nivel de satisfacción en las secciones ' +
        'evaluadas. Revise las observaciones para oportunidades puntuales de mejora.'
      );
    case 'Aceptable':
      return (
        'Resultado aceptable, con oportunidades de mejora. Se recomienda priorizar las secciones ' +
        'con menor porcentaje y los hallazgos registrados en observaciones.'
      );
    case 'Requiere atención':
      return (
        'Resultado requiere atención. Se recomienda un plan de acción sobre las secciones con menor ' +
        'desempeño y seguimiento en el próximo espacio de relacionamiento.'
      );
    default:
      return (
        'Sin puntaje cuantitativo. El análisis se basa únicamente en las observaciones registradas.'
      );
  }
}

export function formatearEtiquetaSeccion(
  obtenidos: number,
  posibles: number,
  porcentaje: number | null,
): string {
  if (posibles <= 0 || porcentaje === null) return 'N/A';
  const pct = Math.round(porcentaje * 10) / 10;
  return `${obtenidos}/${posibles} — ${pct}%`;
}

export function calcularResumenDesdeItems(
  secciones: Array<{
    id: number;
    orden: number;
    titulo: string;
    items: Array<{ id: number; requiereCalificacion: boolean }>;
  }>,
  respuestas: Array<{ itemId: number; puntaje: number | null }>,
): ResumenEncuesta {
  const puntajePorItem = new Map(
    respuestas.map((r) => [Number(r.itemId), r.puntaje]),
  );

  let totalObtenidos = 0;
  let totalPosibles = 0;

  const seccionesResumen: ResumenSeccion[] = secciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((seccion) => {
      const calificables = seccion.items.filter((i) => i.requiereCalificacion);
      let obtenidos = 0;
      const posibles = calificables.length * 5;

      for (const item of calificables) {
        const puntaje = puntajePorItem.get(Number(item.id));
        if (typeof puntaje === 'number') {
          obtenidos += puntaje;
        }
      }

      const porcentaje = posibles > 0 ? (obtenidos / posibles) * 100 : null;
      totalObtenidos += obtenidos;
      totalPosibles += posibles;

      return {
        seccionId: Number(seccion.id),
        orden: seccion.orden,
        titulo: seccion.titulo,
        puntosObtenidos: obtenidos,
        puntosPosibles: posibles,
        porcentaje: porcentaje === null ? null : Math.round(porcentaje * 10) / 10,
        etiqueta: formatearEtiquetaSeccion(
          obtenidos,
          posibles,
          porcentaje === null ? null : Math.round(porcentaje * 10) / 10,
        ),
      };
    });

  const porcentajeGlobal =
    totalPosibles > 0 ? Math.round((totalObtenidos / totalPosibles) * 1000) / 10 : null;
  const categoria = categoriaDesdePorcentaje(porcentajeGlobal);

  return {
    secciones: seccionesResumen,
    puntosObtenidos: totalObtenidos,
    puntosPosibles: totalPosibles,
    porcentajeGlobal,
    categoria,
    veredictoSugerido: textoVeredictoSugerido(categoria),
  };
}

export function agregarResumenes(resumenes: ResumenEncuesta[]): ResumenEncuesta {
  if (!resumenes.length) {
    const categoria: CategoriaVeredicto = 'N/A';
    return {
      secciones: [],
      puntosObtenidos: 0,
      puntosPosibles: 0,
      porcentajeGlobal: null,
      categoria,
      veredictoSugerido: textoVeredictoSugerido(categoria),
    };
  }

  const porSeccion = new Map<
    number,
    { orden: number; titulo: string; obtenidos: number; posibles: number }
  >();

  for (const resumen of resumenes) {
    for (const sec of resumen.secciones) {
      const actual = porSeccion.get(sec.seccionId) ?? {
        orden: sec.orden,
        titulo: sec.titulo,
        obtenidos: 0,
        posibles: 0,
      };
      actual.obtenidos += sec.puntosObtenidos;
      actual.posibles += sec.puntosPosibles;
      porSeccion.set(sec.seccionId, actual);
    }
  }

  let totalObtenidos = 0;
  let totalPosibles = 0;
  const secciones: ResumenSeccion[] = [...porSeccion.entries()]
    .map(([seccionId, data]) => {
      totalObtenidos += data.obtenidos;
      totalPosibles += data.posibles;
      const porcentaje =
        data.posibles > 0 ? Math.round((data.obtenidos / data.posibles) * 1000) / 10 : null;
      return {
        seccionId,
        orden: data.orden,
        titulo: data.titulo,
        puntosObtenidos: data.obtenidos,
        puntosPosibles: data.posibles,
        porcentaje,
        etiqueta: formatearEtiquetaSeccion(data.obtenidos, data.posibles, porcentaje),
      };
    })
    .sort((a, b) => a.orden - b.orden);

  const porcentajeGlobal =
    totalPosibles > 0 ? Math.round((totalObtenidos / totalPosibles) * 1000) / 10 : null;
  const categoria = categoriaDesdePorcentaje(porcentajeGlobal);

  return {
    secciones,
    puntosObtenidos: totalObtenidos,
    puntosPosibles: totalPosibles,
    porcentajeGlobal,
    categoria,
    veredictoSugerido: textoVeredictoSugerido(categoria),
  };
}
