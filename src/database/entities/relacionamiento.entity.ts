import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CanalRelacionamiento } from '../../common/enums/canal-relacionamiento.enum';
import { ResultadoRelacionamiento } from '../../common/enums/resultado-relacionamiento.enum';
import { Contacto } from './contacto.entity';
import { Usuario } from './usuario.entity';

@Entity('relacionamientos')
export class Relacionamiento {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'contacto_id', type: 'bigint', unsigned: true })
  contactoId: number;

  @Column({ name: 'emisor_usuario_id', type: 'bigint', unsigned: true })
  emisorUsuarioId: number;

  @Column({
    type: 'enum',
    enum: CanalRelacionamiento,
  })
  canal: CanalRelacionamiento;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ name: 'fecha_mensaje', type: 'date' })
  fechaMensaje: string;

  @Column({ type: 'text', nullable: true })
  respuesta: string | null;

  @Column({ name: 'fecha_respuesta', type: 'date', nullable: true })
  fechaRespuesta: string | null;

  @Column({
    type: 'enum',
    enum: ResultadoRelacionamiento,
  })
  resultado: ResultadoRelacionamiento;

  @Column({ name: 'fecha_reunion', type: 'date', nullable: true })
  fechaReunion: string | null;

  @Column({ type: 'boolean', default: false })
  eliminado: boolean;

  @Column({ name: 'fecha_eliminacion', type: 'datetime', nullable: true })
  fechaEliminacion: Date | null;

  @Column({ name: 'eliminado_por_id', type: 'bigint', unsigned: true, nullable: true })
  eliminadoPorId: number | null;

  @ManyToOne(() => Contacto, { nullable: false })
  @JoinColumn({ name: 'contacto_id' })
  contacto: Contacto;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'emisor_usuario_id' })
  emisorUsuario: Usuario;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;
}
