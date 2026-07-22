import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';

@Entity('ubicaciones_geograficas')
@Unique('uk_ubicacion', ['paisId', 'departamento', 'municipioProvincia'])
export class UbicacionGeografica {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 150 })
  departamento: string;

  @Column({ name: 'municipio_provincia', type: 'varchar', length: 150 })
  municipioProvincia: string;

  @ManyToOne(() => Pais, (pais) => pais.ubicaciones, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;
}
