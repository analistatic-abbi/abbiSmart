import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { HttpStatus } from '@nestjs/common';

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

async function parseXlsx(buffer: Buffer): Promise<string[][]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      'El archivo Excel no contiene hojas',
      HttpStatus.BAD_REQUEST,
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  const normalized = rows
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell));

  if (!normalized.length) {
    throw new BusinessException(
      ErrorCode.CARGA_MASIVA_FORMATO_INVALIDO,
      'El archivo Excel está vacío',
      HttpStatus.BAD_REQUEST,
    );
  }

  return normalized;
}

export async function readSpreadsheet(
  buffer: Buffer,
  fileName: string,
): Promise<string[][]> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
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
