import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { VeredictoValidacion } from '../../common/enums/veredicto-validacion.enum';
import { Proceso } from './proceso.entity';
import { Usuario } from './usuario.entity';

@Entity('validaciones_proceso')
@Unique('uk_proceso_validador', ['procesoId', 'validadorId'])
export class ValidacionProceso {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @Column({ name: 'validador_id', type: 'bigint', unsigned: true })
  validadorId: number;

  @Column({
    type: 'enum',
    enum: VeredictoValidacion,
    default: VeredictoValidacion.PENDIENTE,
  })
  veredicto: VeredictoValidacion;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @Column({
    name: 'fecha_asignacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaAsignacion: Date;

  @Column({ name: 'fecha_veredicto', type: 'datetime', nullable: true })
  fechaVeredicto: Date | null;

  @ManyToOne(() => Proceso, (proceso) => proceso.validaciones, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'validador_id' })
  validador: Usuario;
}
