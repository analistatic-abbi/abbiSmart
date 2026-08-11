import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Cliente } from './cliente.entity';
import { Pais } from './pais.entity';
import { Proceso } from './proceso.entity';
import { Usuario } from './usuario.entity';
import { KamRonda } from './kam-ronda.entity';

@Entity('kams')
@Unique('uk_kams_proceso', ['procesoId'])
export class Kam {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ name: 'empresa_cliente_id', type: 'bigint', unsigned: true })
  empresaClienteId: number;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({ name: 'creado_por_id', type: 'bigint', unsigned: true, nullable: true })
  creadoPorId: number | null;

  @OneToOne(() => Proceso, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'empresa_cliente_id' })
  empresaCliente: Cliente;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor: Usuario | null;

  @OneToMany(() => KamRonda, (ronda) => ronda.kam)
  rondas: KamRonda[];
}
