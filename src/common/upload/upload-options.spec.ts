import { attachmentUploadOptions, spreadsheetUploadOptions } from './upload-options';

describe('upload-options', () => {
  it('configures spreadsheet multer limits with fieldArrayIndexLimit', () => {
    const options = spreadsheetUploadOptions();
    expect(options.limits).toMatchObject({
      fileSize: 2 * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldArrayIndexLimit: 32,
    });
    expect(typeof options.fileFilter).toBe('function');
  });

  it('configures attachment multer limits for multi-file uploads', () => {
    const options = attachmentUploadOptions(20);
    expect(options.limits).toMatchObject({
      fileSize: 10 * 1024 * 1024,
      files: 20,
      fieldArrayIndexLimit: 32,
    });
  });

  it('rejects unsafe spreadsheet filenames synchronously', () => {
    const options = spreadsheetUploadOptions();
    const callback = jest.fn();

    options.fileFilter!(
      {} as never,
      {
        originalname: '../evil.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });

  it('accepts valid spreadsheet csv files', () => {
    const options = spreadsheetUploadOptions();
    const callback = jest.fn();

    options.fileFilter!(
      {} as never,
      {
        originalname: 'clientes.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
