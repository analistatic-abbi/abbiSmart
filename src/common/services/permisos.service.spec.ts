import { Rol } from '../enums/rol.enum';
import { PermisosService } from './permisos.service';

describe('PermisosService', () => {
  let service: PermisosService;

  beforeEach(() => {
    service = new PermisosService();
  });

  it('Visitante es solo lectura', () => {
    expect(service.esSoloLectura(Rol.VISITANTE)).toBe(true);
    expect(service.puedeEscribir(Rol.VISITANTE)).toBe(false);
  });

  it('roles operativos pueden escribir', () => {
    const roles = [
      Rol.ADMINISTRADOR,
      Rol.SUPERVISOR_SISTEMA,
      Rol.OPERADOR,
      Rol.VALIDADOR,
    ];

    for (const rol of roles) {
      expect(service.puedeEscribir(rol)).toBe(true);
    }
  });

  it('solo Administrador administra usuarios', () => {
    expect(service.puedeAdministrarUsuarios(Rol.ADMINISTRADOR)).toBe(true);
    expect(service.puedeAdministrarUsuarios(Rol.SUPERVISOR_SISTEMA)).toBe(
      false,
    );
  });

  it('módulo validación accesible para Validador, Admin y Supervisor', () => {
    expect(service.puedeAccederModuloValidacion(Rol.VALIDADOR)).toBe(true);
    expect(service.puedeAccederModuloValidacion(Rol.ADMINISTRADOR)).toBe(true);
    expect(service.puedeAccederModuloValidacion(Rol.SUPERVISOR_SISTEMA)).toBe(
      true,
    );
    expect(service.puedeAccederModuloValidacion(Rol.VISITANTE)).toBe(false);
  });

  it('solo Validador ejecuta validación', () => {
    expect(service.puedeEjecutarValidacion(Rol.VALIDADOR)).toBe(true);
    expect(service.puedeEjecutarValidacion(Rol.ADMINISTRADOR)).toBe(false);
  });

  it('gestión de procesos excluye Visitante y Validador', () => {
    expect(service.puedeGestionarProcesos(Rol.OPERADOR)).toBe(true);
    expect(service.puedeGestionarProcesos(Rol.VISITANTE)).toBe(false);
    expect(service.puedeGestionarProcesos(Rol.VALIDADOR)).toBe(false);
  });
});
