import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ResultadoCalificacion } from '../../common/enums/resultado-calificacion.enum';
import { FormatoCalificacion } from './formato-calificacion.entity';
import { Proceso } from './proceso.entity';
import { ProcesoCalificacionDetalle } from './proceso-calificacion-detalle.entity';
import { Usuario } from './usuario.entity';

@Entity('proceso_calificaciones')
@Unique('uk_proceso_formato_calificacion', ['procesoId', 'formatoCalificacionId'])
export class ProcesoCalificacion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @Column({ name: 'formato_calificacion_id', type: 'bigint', unsigned: true })
  formatoCalificacionId: number;

  @Column({ name: 'anio_parametros', type: 'smallint', unsigned: true })
  anioParametros: number;

  @Column({ name: 'puntaje_total', type: 'int', unsigned: true })
  puntajeTotal: number;

  @Column({ name: 'puntaje_minimo', type: 'int', unsigned: true })
  puntajeMinimo: number;

  @Column({
    type: 'enum',
    enum: ResultadoCalificacion,
  })
  resultado: ResultadoCalificacion;

  @Column({ name: 'usuario_evaluo_id', type: 'bigint', unsigned: true })
  usuarioEvaluoId: number;

  @Column({
    name: 'fecha_evaluacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaEvaluacion: Date;

  @ManyToOne(() => Proceso, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => FormatoCalificacion, { nullable: false })
  @JoinColumn({ name: 'formato_calificacion_id' })
  formatoCalificacion: FormatoCalificacion;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_evaluo_id' })
  usuarioEvaluo: Usuario;

  @OneToMany(() => ProcesoCalificacionDetalle, (detalle) => detalle.procesoCalificacion)
  detalle: ProcesoCalificacionDetalle[];
}
