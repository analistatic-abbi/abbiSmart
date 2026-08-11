import { normalizeContactoIds } from './proceso-contactos.util';

describe('normalizeContactoIds', () => {
  it('should deduplicate and filter invalid ids', () => {
    expect(normalizeContactoIds([1, 1, 2, 0, -1, 3.5, NaN as number])).toEqual([
      1, 2,
    ]);
  });

  it('should return empty array for empty input', () => {
    expect(normalizeContactoIds([])).toEqual([]);
  });
});
