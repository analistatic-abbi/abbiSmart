import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';
import { Usuario } from './usuario.entity';

@Entity('metas_anuales')
@Unique('uk_metas_anuales_pais_anio', ['paisId', 'anio'])
export class MetaAnual {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'smallint', unsigned: true })
  anio: number;

  @Column({ name: 'meta_adjudicacion', type: 'decimal', precision: 18, scale: 2 })
  metaAdjudicacion: string;

  @Column({ name: 'meta_facturacion', type: 'decimal', precision: 18, scale: 2 })
  metaFacturacion: string;

  @Column({ name: 'actualizado_por_id', type: 'bigint', unsigned: true })
  actualizadoPorId: number;

  @Column({
    name: 'fecha_actualizacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'actualizado_por_id' })
  actualizadoPor: Usuario;
}
