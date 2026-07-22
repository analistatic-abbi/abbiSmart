import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoProceso } from '../../common/enums/estado-proceso.enum';
import { Moneda } from '../../common/enums/moneda.enum';
import { SegmentoProceso } from '../../common/enums/segmento-proceso.enum';
import { TipoInstrumento } from '../../common/enums/tipo-instrumento.enum';
import { TipoProceso } from '../../common/enums/tipo-proceso.enum';
import { Cliente } from './cliente.entity';
import { Pais } from './pais.entity';
import { ProcesoIndicador } from './proceso-indicador.entity';
import { ProcesoTarea } from './proceso-tarea.entity';
import { UbicacionGeografica } from './ubicacion-geografica.entity';
import { Usuario } from './usuario.entity';
import { ValidacionProceso } from './validacion-proceso.entity';

@Entity('procesos')
export class Proceso {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'id_digitado', type: 'varchar', length: 50 })
  idDigitado: string;

  @Column({ type: 'varchar', length: 70, nullable: true })
  codigo: string | null;

  @Column({ name: 'empresa_cliente_id', type: 'bigint', unsigned: true, nullable: true })
  empresaClienteId: number | null;

  @Column({ name: 'empresa_otro', type: 'varchar', length: 255, nullable: true })
  empresaOtro: string | null;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ name: 'ubicacion_id', type: 'bigint', unsigned: true })
  ubicacionId: number;

  @Column({ name: 'portal_origen', type: 'varchar', length: 255, nullable: true })
  portalOrigen: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  cuantia: string;

  @Column({ type: 'enum', enum: Moneda })
  moneda: Moneda;

  @Column({ type: 'enum', enum: SegmentoProceso })
  segmento: SegmentoProceso;

  @Column({ name: 'tipo_proceso', type: 'enum', enum: TipoProceso })
  tipoProceso: TipoProceso;

  @Column({ name: 'tipo_instrumento', type: 'enum', enum: TipoInstrumento })
  tipoInstrumento: TipoInstrumento;

  @Column({ name: 'plazo_ejecucion_meses', type: 'smallint', unsigned: true })
  plazoEjecucionMeses: number;

  @Column({ type: 'boolean', default: false })
  experiencia: boolean;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ type: 'enum', enum: EstadoProceso, default: EstadoProceso.POR_VALIDAR })
  estado: EstadoProceso;

  @Column({ name: 'usuario_creador_id', type: 'bigint', unsigned: true })
  usuarioCreadorId: number;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({ name: 'fecha_apertura', type: 'date' })
  fechaApertura: string;

  @Column({ name: 'fecha_manifestacion_interes', type: 'date', nullable: true })
  fechaManifestacionInteres: string | null;

  @Column({ name: 'fecha_adquisicion_derecho', type: 'date', nullable: true })
  fechaAdquisicionDerecho: string | null;

  @Column({ name: 'fecha_reunion_aclaratoria', type: 'date', nullable: true })
  fechaReunionAclaratoria: string | null;

  @Column({ name: 'fecha_visita_tecnica', type: 'date', nullable: true })
  fechaVisitaTecnica: string | null;

  @Column({ name: 'fecha_solicitudes_aclaracion', type: 'date', nullable: true })
  fechaSolicitudesAclaracion: string | null;

  @Column({ name: 'fecha_respuesta_aclaracion', type: 'date', nullable: true })
  fechaRespuestaAclaracion: string | null;

  @Column({ name: 'fecha_limitacion_mypymes', type: 'date', nullable: true })
  fechaLimitacionMypymes: string | null;

  @Column({ name: 'fecha_cierre', type: 'date' })
  fechaCierre: string;

  @Column({
    name: 'fecha_inicio_ejecucion',
    type: 'date',
    insert: false,
    update: false,
  })
  fechaInicioEjecucion: string | null;

  @Column({
    name: 'fecha_finalizacion',
    type: 'date',
    insert: false,
    update: false,
  })
  fechaFinalizacion: string | null;

  @Column({ type: 'boolean', default: false })
  eliminado: boolean;

  @Column({ name: 'fecha_eliminacion', type: 'datetime', nullable: true })
  fechaEliminacion: Date | null;

  @Column({ name: 'eliminado_por_id', type: 'bigint', unsigned: true, nullable: true })
  eliminadoPorId: number | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'empresa_cliente_id' })
  empresaCliente: Cliente | null;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => UbicacionGeografica, { nullable: false })
  @JoinColumn({ name: 'ubicacion_id' })
  ubicacion: UbicacionGeografica;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_creador_id' })
  usuarioCreador: Usuario;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;

  @OneToMany(() => ProcesoIndicador, (indicador) => indicador.proceso)
  indicadores: ProcesoIndicador[];

  @OneToMany(() => ProcesoTarea, (tarea) => tarea.proceso)
  tareas: ProcesoTarea[];

  @OneToMany(() => ValidacionProceso, (validacion) => validacion.proceso)
  validaciones: ValidacionProceso[];
}
