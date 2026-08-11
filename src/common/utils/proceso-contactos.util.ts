export function normalizeContactoIds(contactoIds: number[]): number[] {
  const unique = new Set<number>();

  for (const raw of contactoIds) {
    const id = Number(raw);

    if (Number.isInteger(id) && id > 0) {
      unique.add(id);
    }
  }

  return [...unique];
}
