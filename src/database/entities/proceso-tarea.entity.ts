import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TareaCodigo } from '../../common/enums/tarea-codigo.enum';
import { Proceso } from './proceso.entity';
import { Usuario } from './usuario.entity';

@Entity('proceso_tareas')
@Unique('uk_proceso_tarea', ['procesoId', 'tareaCodigo'])
export class ProcesoTarea {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @Column({
    name: 'tarea_codigo',
    type: 'enum',
    enum: TareaCodigo,
  })
  tareaCodigo: TareaCodigo;

  @Column({ type: 'boolean', default: true })
  aplica: boolean;

  @Column({ type: 'text', nullable: true })
  evidencia: string | null;

  @Column({ type: 'boolean', default: false })
  completada: boolean;

  @Column({ name: 'fecha_completada', type: 'datetime', nullable: true })
  fechaCompletada: Date | null;

  @Column({ name: 'usuario_completo_id', type: 'bigint', unsigned: true, nullable: true })
  usuarioCompletoId: number | null;

  @ManyToOne(() => Proceso, (proceso) => proceso.tareas, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_completo_id' })
  usuarioCompleto: Usuario | null;
}
