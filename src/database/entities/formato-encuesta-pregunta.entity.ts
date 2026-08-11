import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FormatoEncuestaItem } from './formato-encuesta-item.entity';
import { FormatoEncuestaSeccion } from './formato-encuesta-seccion.entity';

@Entity('formato_encuesta_preguntas')
@Unique('uk_formato_encuesta_pregunta_orden', ['seccionId', 'orden'])
export class FormatoEncuestaPregunta {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'seccion_id', type: 'bigint', unsigned: true })
  seccionId: number;

  @Column({ type: 'smallint', unsigned: true })
  orden: number;

  @Column({ type: 'varchar', length: 500 })
  texto: string;

  @ManyToOne(() => FormatoEncuestaSeccion, (seccion) => seccion.preguntas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seccion_id' })
  seccion: FormatoEncuestaSeccion;

  @OneToMany(() => FormatoEncuestaItem, (item) => item.pregunta)
  items: FormatoEncuestaItem[];
}
