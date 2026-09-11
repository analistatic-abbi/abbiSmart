import { memoryStorage, type Options } from 'multer';
import {
  extensionOf,
  rulesForProfile,
  type UploadProfile,
} from './upload.types';

const MB = 1024 * 1024;

function isSafeFileName(fileName: string): boolean {
  if (!fileName || fileName.length > 180) return false;
  if (fileName.includes('..') || /[/\\]/.test(fileName)) return false;
  return true;
}

function createFileFilter(profile: UploadProfile): NonNullable<Options['fileFilter']> {
  const rules = rulesForProfile(profile);

  return (_req, file, callback) => {
    const originalName = file.originalname?.trim() ?? '';

    if (!isSafeFileName(originalName)) {
      callback(
        new Error('Nombre de archivo inválido. Evite rutas o caracteres no permitidos.'),
      );
      return;
    }

    const extension = extensionOf(originalName);
    const mime = (file.mimetype ?? '').toLowerCase();
    const matched = rules.find(
      (rule) =>
        rule.extensions.includes(extension) &&
        rule.mimeTypes.includes(mime),
    );

    if (!matched) {
      const allowed = rules.flatMap((rule) => rule.extensions).join(', ');
      callback(
        new Error(
          `Tipo de archivo no permitido (${extension || 'sin extensión'} / ${mime || 'sin MIME'}). Use: ${allowed}`,
        ),
      );
      return;
    }

    callback(null, true);
  };
}

function baseLimits(fileSize: number, files: number): NonNullable<Options['limits']> {
  return {
    fileSize,
    files,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 64 * 1024,
    // Multer 2.3.0 DoS mitigation (GitHub/OpenJS recommendation).
    // Not yet in @types/multer; runtime option is supported in multer@2.3.0.
    fieldArrayIndexLimit: 32,
  } as NonNullable<Options['limits']>;
}

export function spreadsheetUploadOptions(): Options {
  return {
    storage: memoryStorage(),
    limits: baseLimits(2 * MB, 1),
    fileFilter: createFileFilter('spreadsheet'),
  };
}

export function attachmentUploadOptions(maxFiles = 1): Options {
  return {
    storage: memoryStorage(),
    limits: baseLimits(10 * MB, maxFiles),
    fileFilter: createFileFilter('attachment'),
  };
}
