import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FormatoEncuestaPregunta } from './formato-encuesta-pregunta.entity';
import { KamEncuestaRespuesta } from './kam-encuesta-respuesta.entity';

@Entity('formato_encuesta_items')
@Unique('uk_formato_encuesta_item_orden', ['preguntaId', 'orden'])
export class FormatoEncuestaItem {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pregunta_id', type: 'bigint', unsigned: true })
  preguntaId: number;

  @Column({ type: 'smallint', unsigned: true })
  orden: number;

  @Column({ type: 'varchar', length: 250, nullable: true })
  subseccion: string | null;

  @Column({ name: 'requiere_calificacion', type: 'boolean', default: true })
  requiereCalificacion: boolean;

  @ManyToOne(() => FormatoEncuestaPregunta, (pregunta) => pregunta.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pregunta_id' })
  pregunta: FormatoEncuestaPregunta;

  @OneToMany(() => KamEncuestaRespuesta, (respuesta) => respuesta.item)
  respuestas: KamEncuestaRespuesta[];
}
