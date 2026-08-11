import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { KamRonda } from './kam-ronda.entity';
import { Usuario } from './usuario.entity';

@Entity('kam_ronda_bitacora')
export class KamRondaBitacora {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'ronda_id', type: 'bigint', unsigned: true })
  rondaId: number;

  @Column({ name: 'usuario_id', type: 'bigint', unsigned: true })
  usuarioId: number;

  @Column({ type: 'text' })
  texto: string;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @ManyToOne(() => KamRonda, (ronda) => ronda.bitacoraEntradas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ronda_id' })
  ronda: KamRonda;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
