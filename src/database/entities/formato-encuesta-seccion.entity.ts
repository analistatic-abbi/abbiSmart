import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FormatoEncuesta } from './formato-encuesta.entity';
import { FormatoEncuestaPregunta } from './formato-encuesta-pregunta.entity';

@Entity('formato_encuesta_secciones')
@Unique('uk_formato_encuesta_seccion_orden', ['formatoEncuestaId', 'orden'])
export class FormatoEncuestaSeccion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'formato_encuesta_id', type: 'bigint', unsigned: true })
  formatoEncuestaId: number;

  @Column({ type: 'smallint', unsigned: true })
  orden: number;

  @Column({ type: 'varchar', length: 250 })
  titulo: string;

  @ManyToOne(() => FormatoEncuesta, (formato) => formato.secciones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'formato_encuesta_id' })
  formato: FormatoEncuesta;

  @OneToMany(() => FormatoEncuestaPregunta, (pregunta) => pregunta.seccion)
  preguntas: FormatoEncuestaPregunta[];
}
