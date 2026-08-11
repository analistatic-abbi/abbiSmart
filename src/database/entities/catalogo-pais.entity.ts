import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CatalogoPaisTipo } from '../../common/enums/catalogo-pais-tipo.enum';
import { Pais } from './pais.entity';

@Entity('catalogo_pais')
@Unique('uk_catalogo_pais', ['paisId', 'tipo', 'codigo'])
export class CatalogoPais {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 40 })
  tipo: CatalogoPaisTipo;

  @Column({ type: 'varchar', length: 100 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  etiqueta: string;

  @Column({ type: 'smallint', unsigned: true })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ManyToOne(() => Pais, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;
}
