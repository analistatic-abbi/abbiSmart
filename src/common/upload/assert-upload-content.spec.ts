import { BusinessException } from '../exceptions/business.exception';
import { assertUploadContent } from './assert-upload-content';

describe('assertUploadContent', () => {
  it('accepts csv text content', () => {
    const file = {
      originalname: 'datos.csv',
      mimetype: 'text/csv',
      buffer: Buffer.from('empresa,pais\nAcme,CO\n', 'utf8'),
    } as Express.Multer.File;

    expect(() => assertUploadContent(file, 'spreadsheet')).not.toThrow();
  });

  it('rejects exe disguised as csv', () => {
    const file = {
      originalname: 'malware.csv',
      mimetype: 'text/csv',
      buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
    } as Express.Multer.File;

    expect(() => assertUploadContent(file, 'spreadsheet')).toThrow(BusinessException);
  });

  it('rejects empty buffers', () => {
    const file = {
      originalname: 'vacio.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;

    expect(() => assertUploadContent(file, 'spreadsheet')).toThrow(BusinessException);
  });

  it('accepts zip/ooxml signature for xlsx', () => {
    const file = {
      originalname: 'plantilla.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
    } as Express.Multer.File;

    expect(() => assertUploadContent(file, 'spreadsheet')).not.toThrow();
  });
});
