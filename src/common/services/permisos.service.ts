import { Injectable } from '@nestjs/common';
import { Rol } from '../enums/rol.enum';

@Injectable()
export class PermisosService {
  /** Visitante y Validador: solo lectura global (Validador escribe veredicto vía endpoint dedicado). */
  esSoloLectura(rol: Rol): boolean {
    return rol === Rol.VISITANTE || rol === Rol.VALIDADOR;
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
    return rol === Rol.VALIDADOR || rol === Rol.ADMINISTRADOR;
  }

  puedeGestionarProcesos(rol: Rol): boolean {
    return (
      rol === Rol.ADMINISTRADOR ||
      rol === Rol.SUPERVISOR_SISTEMA ||
      rol === Rol.OPERADOR
    );
  }

  puedeEditarFechas(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR || rol === Rol.SUPERVISOR_SISTEMA;
  }

  puedeAsignarMercado(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR || rol === Rol.SUPERVISOR_SISTEMA;
  }

  puedeCerrarProyeccion(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR || rol === Rol.SUPERVISOR_SISTEMA;
  }

  puedeEliminarDirecto(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR;
  }

  puedeVerEliminados(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR || rol === Rol.SUPERVISOR_SISTEMA;
  }

  puedeGestionarParametros(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR;
  }

  puedeActivarCargaMasiva(rol: Rol): boolean {
    return rol === Rol.ADMINISTRADOR;
  }
}
