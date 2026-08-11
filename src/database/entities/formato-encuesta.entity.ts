import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';
import { FormatoEncuestaSeccion } from './formato-encuesta-seccion.entity';

@Entity('formatos_encuesta')
@Unique('uk_formato_encuesta_pais_nombre', ['paisId', 'nombre'])
export class FormatoEncuesta {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'clonado_de_id', type: 'bigint', unsigned: true, nullable: true })
  clonadoDeId: number | null;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => FormatoEncuesta, { nullable: true })
  @JoinColumn({ name: 'clonado_de_id' })
  clonadoDe: FormatoEncuesta | null;

  @OneToMany(() => FormatoEncuestaSeccion, (seccion) => seccion.formato)
  secciones: FormatoEncuestaSeccion[];
}
