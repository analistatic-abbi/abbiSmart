import { Injectable } from '@nestjs/common';
import { Rol } from '../enums/rol.enum';

@Injectable()
export class PermisosService {
  esSoloLectura(rol: Rol): boolean {
    return rol === Rol.VISITANTE;
  }

  puedeEscribir(rol: Rol): boolean {
    return !this.esSoloLectura(rol);
  }

  puedeAdministrarUsuarios(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR;
  }

  puedeAccederModuloValidacion(rol: Rol): boolean {
    return (
      rol === Rol.VALIDADOR ||
      rol === Rol.ADMINISTRADOR ||
      rol === Rol.SUPERVISOR_SISTEMA
    );
  }

  puedeEjecutarValidacion(rol: Rol): boolean {
    return rol === Rol.VALIDADOR;
  }

  puedeGestionarProcesos(rol: Rol): boolean {
    return (
      rol === Rol.ADMINISTRADOR ||
      rol === Rol.SUPERVISOR_SISTEMA ||
      rol === Rol.OPERADOR
    );
  }
}
