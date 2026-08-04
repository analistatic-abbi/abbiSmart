import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FijacionEntidadTipo } from '../../common/enums/fijacion-entidad-tipo.enum';
import { Usuario } from './usuario.entity';

@Entity('usuario_fijaciones')
@Unique('uk_usuario_fijacion', ['usuarioId', 'entidadTipo', 'entidadId'])
export class UsuarioFijacion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'usuario_id', type: 'bigint', unsigned: true })
  usuarioId: number;

  @Column({
    name: 'entidad_tipo',
    type: 'enum',
    enum: FijacionEntidadTipo,
  })
  entidadTipo: FijacionEntidadTipo;

  @Column({ name: 'entidad_id', type: 'bigint', unsigned: true })
  entidadId: number;

  @Column({
    name: 'fecha_fijacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaFijacion: Date;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;
}
