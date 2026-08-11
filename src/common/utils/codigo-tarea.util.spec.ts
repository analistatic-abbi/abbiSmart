import { generarCodigoTarea } from './codigo-tarea.util';

describe('generarCodigoTarea', () => {
  it('should build pascal case words joined by underscore', () => {
    expect(generarCodigoTarea('Revisión legal preliminar')).toBe(
      'Revision_Legal_Preliminar',
    );
  });

  it('should fallback when nombre is empty', () => {
    expect(generarCodigoTarea('   ')).toBe('Tarea');
  });
});
