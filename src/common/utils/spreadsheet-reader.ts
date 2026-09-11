import { HttpStatus } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';

function parseCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim());
}

function parseCsv(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, '').trim();

  if (!normalized) {
    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      'El archivo está vacío',
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line))
    .filter((row) => row.some((cell) => cell.trim()));
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('text' in value && value.text != null) return String(value.text).trim();
    if ('result' in value && value.result != null) return String(value.result).trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
  }
  return String(value).trim();
}

async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs typings expect ArrayBuffer-like input; Node Buffer is compatible at runtime.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      'El archivo Excel no contiene hojas',
      HttpStatus.BAD_REQUEST,
    );
  }

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    const normalized = values.map((cell) => cellToString(cell as ExcelJS.CellValue));
    if (normalized.some((cell) => cell)) {
      rows.push(normalized);
    }
  });

  if (!rows.length) {
    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      'El archivo Excel está vacío',
      HttpStatus.BAD_REQUEST,
    );
  }

  return rows;
}

export async function readSpreadsheet(
  buffer: Buffer,
  fileName: string,
): Promise<string[][]> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.xlsx')) {
    return parseXlsx(buffer);
  }

  if (lower.endsWith('.csv')) {
    return parseCsv(buffer.toString('utf8'));
  }

  throw new BusinessException(
    ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
    'Formato no soportado. Use CSV o Excel (.xlsx)',
    HttpStatus.BAD_REQUEST,
  );
}

export function normalizeHeaders(row: string[]): string[] {
  return row.map((header) => header.toLowerCase().trim());
}
