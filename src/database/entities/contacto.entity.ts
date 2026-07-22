import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from './cliente.entity';
import { UbicacionGeografica } from './ubicacion-geografica.entity';
import { Usuario } from './usuario.entity';

@Entity('contactos')
export class Contacto {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'cliente_id', type: 'bigint', unsigned: true })
  clienteId: number;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  cargo: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correo: string | null;

  @Column({ name: 'ubicacion_id', type: 'bigint', unsigned: true })
  ubicacionId: number;

  @Column({ name: 'es_generico', type: 'boolean', default: false })
  esGenerico: boolean;

  @Column({
    name: 'referido_por_contacto_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  referidoPorContactoId: number | null;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({ type: 'boolean', default: false })
  eliminado: boolean;

  @Column({ name: 'fecha_eliminacion', type: 'datetime', nullable: true })
  fechaEliminacion: Date | null;

  @Column({ name: 'eliminado_por_id', type: 'bigint', unsigned: true, nullable: true })
  eliminadoPorId: number | null;

  @ManyToOne(() => Cliente, (cliente) => cliente.contactos, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @ManyToOne(() => UbicacionGeografica, { nullable: false })
  @JoinColumn({ name: 'ubicacion_id' })
  ubicacion: UbicacionGeografica;

  @ManyToOne(() => Contacto, { nullable: true })
  @JoinColumn({ name: 'referido_por_contacto_id' })
  referidoPorContacto: Contacto | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;
}
