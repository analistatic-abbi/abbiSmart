export interface SpreadsheetSheet {
  name: string;
  rows: Array<Record<string, string | number | null | undefined>>;
}

export function buildWorkbookBuffer(sheets: SpreadsheetSheet[]): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildSingleSheetBuffer(
  name: string,
  rows: Array<Record<string, string | number | null | undefined>>,
): Buffer {
  return buildWorkbookBuffer([{ name, rows }]);
}
