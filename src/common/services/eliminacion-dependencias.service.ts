import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-codes.enum';
import { Cliente } from '../../database/entities/cliente.entity';
import { Contacto } from '../../database/entities/contacto.entity';
import { Proceso } from '../../database/entities/proceso.entity';
import { Proyeccion } from '../../database/entities/proyeccion.entity';
import { ValidacionProceso } from '../../database/entities/validacion-proceso.entity';

export interface DependenciaItem {
  tipo: string;
  id: number;
  descripcion: string;
}

export interface DependenciasResult {
  tieneDependientes: boolean;
  dependientes: DependenciaItem[];
  sugerencias: string[];
}

@Injectable()
export class EliminacionDependenciasService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    @InjectRepository(Contacto)
    private readonly contactoRepository: Repository<Contacto>,
    @InjectRepository(Proceso)
    private readonly procesoRepository: Repository<Proceso>,
    @InjectRepository(Proyeccion)
    private readonly proyeccionRepository: Repository<Proyeccion>,
    @InjectRepository(ValidacionProceso)
    private readonly validacionRepository: Repository<ValidacionProceso>,
  ) {}

  async verificarCliente(clienteId: number): Promise<DependenciasResult> {
    const dependientes: DependenciaItem[] = [];

    const contactos = await this.contactoRepository.count({
      where: { clienteId, eliminado: false },
    });

    if (contactos > 0) {
      dependientes.push({
        tipo: 'contacto',
        id: clienteId,
        descripcion: `${contactos} contacto(s) activo(s)`,
      });
    }

    const procesos = await this.procesoRepository.count({
      where: { empresaClienteId: clienteId, eliminado: false },
    });

    if (procesos > 0) {
      dependientes.push({
        tipo: 'proceso',
        id: clienteId,
        descripcion: `${procesos} proceso(s) vinculado(s)`,
      });
    }

    return this.buildResult(dependientes, [
      'Elimine o reasigne los contactos antes de continuar',
      'Reasigne los procesos a otro cliente o use empresa Otro',
    ]);
  }

  async verificarProceso(procesoId: number): Promise<DependenciasResult> {
    const dependientes: DependenciaItem[] = [];

    const validaciones = await this.validacionRepository.count({
      where: { procesoId },
    });

    if (validaciones > 0) {
      dependientes.push({
        tipo: 'validacion',
        id: procesoId,
        descripcion: `${validaciones} asignación(es) de validación`,
      });
    }

    const proyeccionOrigen = await this.proyeccionRepository.findOne({
      where: { procesoOrigenId: procesoId, eliminado: false },
    });

    if (proyeccionOrigen) {
      dependientes.push({
        tipo: 'proyeccion',
        id: proyeccionOrigen.id,
        descripcion: 'Proyección generada desde este proceso',
      });
    }

    const proyeccionResultante = await this.proyeccionRepository.findOne({
      where: { procesoResultanteId: procesoId, eliminado: false },
    });

    if (proyeccionResultante) {
      dependientes.push({
        tipo: 'proyeccion',
        id: proyeccionResultante.id,
        descripcion: 'Proyección vinculada como proceso resultante',
      });
    }

    return this.buildResult(dependientes, [
      'Cierre o desvincule proyecciones asociadas',
      'Resuelva validaciones pendientes',
    ]);
  }

  async verificarProyeccion(proyeccionId: number): Promise<DependenciasResult> {
    const proyeccion = await this.proyeccionRepository.findOne({
      where: { id: proyeccionId, eliminado: false },
    });

    const dependientes: DependenciaItem[] = [];

    if (proyeccion?.procesoResultanteId) {
      dependientes.push({
        tipo: 'proceso',
        id: proyeccion.procesoResultanteId,
        descripcion: 'Proceso resultante vinculado (estado Publicado)',
      });
    }

    return this.buildResult(dependientes, [
      'Desvincule el proceso resultante antes de eliminar la proyección',
    ]);
  }

  private buildResult(
    dependientes: DependenciaItem[],
    sugerencias: string[],
  ): DependenciasResult {
    return {
      tieneDependientes: dependientes.length > 0,
      dependientes,
      sugerencias,
    };
  }

  assertPuedeEliminar(
    result: DependenciasResult,
    confirmarDependientes: boolean,
    puedeForzar: boolean,
  ): void {
    if (!result.tieneDependientes) {
      return;
    }

    if (confirmarDependientes && puedeForzar) {
      return;
    }

    throw new BusinessException(
      ErrorCode.ELIMINACION_CON_DEPENDENCIAS,
      'No se puede eliminar porque existen registros dependientes',
      HttpStatus.CONFLICT,
      {
        dependientes: result.dependientes,
        sugerencias: result.sugerencias,
      },
    );
  }
}
