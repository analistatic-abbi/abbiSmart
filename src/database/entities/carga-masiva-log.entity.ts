import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('carga_masiva_log')
export class CargaMasivaLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'entidad_tipo', type: 'varchar', length: 50 })
  entidadTipo: string;

  @Column({ name: 'usuario_id', type: 'bigint', unsigned: true })
  usuarioId: number;

  @Column({ name: 'archivo_nombre', type: 'varchar', length: 255 })
  archivoNombre: string;

  @Column({
    name: 'fecha_carga',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCarga: Date;

  @Column({ name: 'filas_exitosas', type: 'int', unsigned: true, default: 0 })
  filasExitosas: number;

  @Column({ name: 'filas_rechazadas', type: 'int', unsigned: true, default: 0 })
  filasRechazadas: number;

  @Column({ name: 'detalle_errores', type: 'json', nullable: true })
  detalleErrores: Record<string, unknown>[] | null;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}
