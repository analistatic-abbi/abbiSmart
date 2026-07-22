import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SegmentoCliente } from '../../common/enums/segmento-cliente.enum';
import { Pais } from './pais.entity';
import { UbicacionGeografica } from './ubicacion-geografica.entity';
import { Usuario } from './usuario.entity';
import { Contacto } from './contacto.entity';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  empresa: string;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ name: 'ubicacion_id', type: 'bigint', unsigned: true })
  ubicacionId: number;

  @Column({
    type: 'enum',
    enum: SegmentoCliente,
  })
  segmento: SegmentoCliente;

  @Column({ name: 'segmento_otro', type: 'varchar', length: 255, nullable: true })
  segmentoOtro: string | null;

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

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => UbicacionGeografica, { nullable: false })
  @JoinColumn({ name: 'ubicacion_id' })
  ubicacion: UbicacionGeografica;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;

  @OneToMany(() => Contacto, (contacto) => contacto.cliente)
  contactos: Contacto[];
}
