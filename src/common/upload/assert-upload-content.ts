import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { extensionOf, type UploadProfile } from './upload.types';

function looksLikeText(buffer: Buffer): boolean {
  if (!buffer.length) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) suspicious += 3;
    else if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length < 0.1;
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((value, index) => buffer[index] === value);
}

function isZip(buffer: Buffer): boolean {
  return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);
}

function isOle(buffer: Buffer): boolean {
  return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0]);
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isPng(buffer: Buffer): boolean {
  return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isJpeg(buffer: Buffer): boolean {
  return startsWith(buffer, [0xff, 0xd8, 0xff]);
}

function isWebp(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

function contentMatchesExtension(extension: string, buffer: Buffer): boolean {
  switch (extension) {
    case '.csv':
    case '.txt':
      return looksLikeText(buffer);
    case '.xlsx':
    case '.docx':
    case '.zip':
      return isZip(buffer);
    case '.xls':
    case '.doc':
      return isOle(buffer);
    case '.pdf':
      return isPdf(buffer);
    case '.png':
      return isPng(buffer);
    case '.jpg':
    case '.jpeg':
      return isJpeg(buffer);
    case '.webp':
      return isWebp(buffer);
    default:
      return false;
  }
}

export function assertUploadContent(
  file: Express.Multer.File,
  profile: UploadProfile,
): void {
  const fileName = file.originalname?.trim() ?? '';
  const extension = extensionOf(fileName);

  if (!file.buffer?.length) {
    throw new BusinessException(
      ErrorCode.UPLOAD_ARCHIVO_INVALIDO,
      'El archivo está vacío',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (profile === 'spreadsheet' && extension !== '.csv' && extension !== '.xlsx') {
    throw new BusinessException(
      ErrorCode.UPLOAD_ARCHIVO_INVALIDO,
      'Formato no soportado. Use CSV o Excel (.xlsx)',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (!contentMatchesExtension(extension, file.buffer)) {
    throw new BusinessException(
      ErrorCode.UPLOAD_ARCHIVO_INVALIDO,
      `El contenido del archivo no coincide con la extensión ${extension || 'desconocida'}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertUploadContents(
  files: Express.Multer.File[],
  profile: UploadProfile,
): void {
  for (const file of files) {
    assertUploadContent(file, profile);
  }
}
