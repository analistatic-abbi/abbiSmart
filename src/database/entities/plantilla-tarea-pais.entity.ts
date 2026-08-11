import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';

@Entity('plantilla_tarea_pais')
@Unique('uk_plantilla_tarea_pais', ['paisId', 'codigo'])
export class PlantillaTareaPais {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 80 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'smallint', unsigned: true })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'aplica_rfi', type: 'boolean', default: true })
  aplicaRfi: boolean;

  @Column({
    name: 'requiere_fecha_adquisicion',
    type: 'boolean',
    default: false,
  })
  requiereFechaAdquisicion: boolean;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;
}
