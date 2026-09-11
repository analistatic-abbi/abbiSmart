import { BusinessException } from '../exceptions/business.exception';
import { readSpreadsheet } from './spreadsheet-reader';
import { buildSingleSheetBuffer } from './spreadsheet-writer';

describe('spreadsheet utils', () => {
  it('round-trips xlsx rows through exceljs writer/reader', async () => {
    const buffer = await buildSingleSheetBuffer('Datos', [
      { Empresa: 'Acme', Pais: 'CO' },
      { Empresa: 'Beta', Pais: 'PE' },
    ]);

    const rows = await readSpreadsheet(buffer, 'datos.xlsx');
    expect(rows[0]).toEqual(['Empresa', 'Pais']);
    expect(rows[1]).toEqual(['Acme', 'CO']);
    expect(rows[2]).toEqual(['Beta', 'PE']);
  });

  it('reads csv content', async () => {
    const rows = await readSpreadsheet(
      Buffer.from('empresa,pais\nAcme,CO\n', 'utf8'),
      'clientes.csv',
    );
    expect(rows).toEqual([
      ['empresa', 'pais'],
      ['Acme', 'CO'],
    ]);
  });

  it('rejects legacy xls extension', async () => {
    await expect(
      readSpreadsheet(Buffer.from('dummy'), 'legacy.xls'),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});
