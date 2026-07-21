import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('log_auditoria')
export class LogAuditoria {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'usuario_id', nullable: true })
  usuarioId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'varchar', length: 50 })
  accion: string;

  @Column({ type: 'varchar', length: 50, name: 'entidad_tipo' })
  entidadTipo: string;

  @Column({ type: 'bigint', unsigned: true, name: 'entidad_id', nullable: true })
  entidadId: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  campo: string | null;

  @Column({ type: 'text', name: 'valor_anterior', nullable: true })
  valorAnterior: string | null;

  @Column({ type: 'text', name: 'valor_nuevo', nullable: true })
  valorNuevo: string | null;

  @Column({
    type: 'datetime',
    name: 'fecha_hora',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaHora: Date;
}
