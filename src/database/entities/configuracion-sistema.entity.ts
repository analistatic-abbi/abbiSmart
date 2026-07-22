import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('configuracion_sistema')
export class ConfiguracionSistema {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'varchar', length: 255 })
  valor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @Column({ name: 'usuario_modifico_id', type: 'bigint', unsigned: true, nullable: true })
  usuarioModificoId: number | null;

  @UpdateDateColumn({
    name: 'fecha_modificacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_modifico_id' })
  usuarioModifico: Usuario | null;
}
