import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Proyeccion } from './proyeccion.entity';
import { Relacionamiento } from './relacionamiento.entity';

@Entity('alertas_enviadas')
@Unique('uk_alerta_proyeccion', ['proyeccionId', 'umbral'])
@Unique('uk_alerta_relacionamiento', ['relacionamientoId', 'umbral'])
export class AlertaEnviada {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proyeccion_id', type: 'bigint', unsigned: true, nullable: true })
  proyeccionId: number | null;

  @Column({ name: 'relacionamiento_id', type: 'bigint', unsigned: true, nullable: true })
  relacionamientoId: number | null;

  @Column({ type: 'varchar', length: 20 })
  umbral: string;

  @Column({
    name: 'fecha_envio',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaEnvio: Date;

  @ManyToOne(() => Proyeccion, { nullable: true })
  @JoinColumn({ name: 'proyeccion_id' })
  proyeccion: Proyeccion | null;

  @ManyToOne(() => Relacionamiento, { nullable: true })
  @JoinColumn({ name: 'relacionamiento_id' })
  relacionamiento: Relacionamiento | null;
}
