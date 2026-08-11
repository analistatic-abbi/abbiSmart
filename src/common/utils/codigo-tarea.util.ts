/**
 * Genera un código interno legible para almacenar en BD (estilo Creacion_De_Carpeta).
 * No debe mostrarse al usuario final.
 */
export function generarCodigoTarea(nombre: string): string {
  const palabras = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((palabra) => {
      const lower = palabra.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });

  const codigo = palabras.join('_').slice(0, 80);

  return codigo || 'Tarea';
}
