import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'usuario_id', type: 'bigint', unsigned: true })
  usuarioId: number;

  @Column({ type: 'varchar', length: 50 })
  tipo: string;

  @Column({ type: 'varchar', length: 500 })
  mensaje: string;

  @Column({ name: 'entidad_tipo', type: 'varchar', length: 50, nullable: true })
  entidadTipo: string | null;

  @Column({ name: 'entidad_id', type: 'bigint', unsigned: true, nullable: true })
  entidadId: number | null;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
