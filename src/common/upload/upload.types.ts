export type UploadProfile = 'spreadsheet' | 'attachment';

export interface UploadTypeRule {
  extensions: string[];
  mimeTypes: string[];
}

export const SPREADSHEET_RULES: UploadTypeRule[] = [
  {
    extensions: ['.csv'],
    mimeTypes: [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ],
  },
  {
    extensions: ['.xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/octet-stream',
    ],
  },
];

export const ATTACHMENT_RULES: UploadTypeRule[] = [
  {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf', 'application/octet-stream'],
  },
  {
    extensions: ['.png'],
    mimeTypes: ['image/png', 'application/octet-stream'],
  },
  {
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'application/octet-stream'],
  },
  {
    extensions: ['.webp'],
    mimeTypes: ['image/webp', 'application/octet-stream'],
  },
  {
    extensions: ['.txt'],
    mimeTypes: ['text/plain', 'application/octet-stream'],
  },
  {
    extensions: ['.csv'],
    mimeTypes: [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ],
  },
  {
    extensions: ['.doc'],
    mimeTypes: ['application/msword', 'application/octet-stream'],
  },
  {
    extensions: ['.docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/octet-stream',
    ],
  },
  {
    extensions: ['.xls'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/octet-stream',
    ],
  },
  {
    extensions: ['.xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/octet-stream',
    ],
  },
  {
    extensions: ['.zip'],
    mimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream',
    ],
  },
];

export function rulesForProfile(profile: UploadProfile): UploadTypeRule[] {
  return profile === 'spreadsheet' ? SPREADSHEET_RULES : ATTACHMENT_RULES;
}

export function extensionOf(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot).toLowerCase();
}
