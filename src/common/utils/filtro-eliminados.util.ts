import { FiltroEliminados } from '../enums/filtro-eliminados.enum';
import { Rol } from '../enums/rol.enum';
import { PermisosService } from '../services/permisos.service';

export function resolveFiltroEliminados(
  filtroEliminados: FiltroEliminados | undefined,
  incluirEliminados: boolean | undefined,
  rol: Rol,
  permisosService: PermisosService,
): FiltroEliminados {
  let filtro = filtroEliminados ?? FiltroEliminados.ACTIVOS;

  if (incluirEliminados === true && filtro === FiltroEliminados.ACTIVOS) {
    filtro = FiltroEliminados.TODOS;
  }

  if (
    filtro !== FiltroEliminados.ACTIVOS &&
    !permisosService.puedeVerEliminados(rol)
  ) {
    return FiltroEliminados.ACTIVOS;
  }

  return filtro;
}

export function applyFiltroEliminadosQb(
  qb: { andWhere: (clause: string, params?: Record<string, unknown>) => void },
  alias: string,
  filtro: FiltroEliminados,
): void {
  if (filtro === FiltroEliminados.ACTIVOS) {
    qb.andWhere(`${alias}.eliminado = false`);
  } else if (filtro === FiltroEliminados.SOLO_ELIMINADOS) {
    qb.andWhere(`${alias}.eliminado = true`);
  }
}
