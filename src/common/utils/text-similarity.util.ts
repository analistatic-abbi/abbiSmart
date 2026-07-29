const LEGAL_SUFFIXES =
  /\b(s\.?\s*a\.?\s*s\.?|s\.?\s*a\.?|sas|ltda|l\.?\s*t\.?\s*d\.?\s*a\.?|inc|corp|e\.?\s*u\.?\s*r\.?\s*l\.?|cia|compania|compañia)\b/gi;

export function normalizeEntityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,'"()\-_/\\]/g, ' ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

export interface SimilarityMatch<T> {
  item: T;
  similitud: number;
}

export function rankBySimilarity<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  threshold = 0.85,
  limit = 5,
): SimilarityMatch<T>[] {
  const normalizedQuery = normalizeEntityName(query);
  if (normalizedQuery.length < 3) {
    return [];
  }

  return items
    .map((item) => ({
      item,
      similitud: similarityRatio(normalizedQuery, normalizeEntityName(getText(item))),
    }))
    .filter((entry) => entry.similitud >= threshold)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, limit);
}
