import ExcelJS from 'exceljs';

export interface SpreadsheetSheet {
  name: string;
  rows: Array<Record<string, string | number | null | undefined>>;
}

export async function buildWorkbookBuffer(sheets: SpreadsheetSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31) || 'Hoja1');
    const headers = sheet.rows.length
      ? Object.keys(sheet.rows[0])
      : [];

    if (headers.length) {
      worksheet.addRow(headers);
      for (const row of sheet.rows) {
        worksheet.addRow(headers.map((header) => row[header] ?? ''));
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildSingleSheetBuffer(
  name: string,
  rows: Array<Record<string, string | number | null | undefined>>,
): Promise<Buffer> {
  return buildWorkbookBuffer([{ name, rows }]);
}
