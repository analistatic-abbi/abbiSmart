import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';

@Entity('configuracion_pais')
@Unique('uk_config_pais_clave', ['paisId', 'clave'])
export class ConfiguracionPais {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'varchar', length: 255 })
  valor: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;
}
