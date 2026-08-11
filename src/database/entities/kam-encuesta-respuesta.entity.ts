import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Contacto } from './contacto.entity';
import { FormatoEncuestaItem } from './formato-encuesta-item.entity';
import { KamEncuesta } from './kam-encuesta.entity';

@Entity('kam_encuesta_respuestas')
@Unique('uk_kam_encuesta_respuesta', ['encuestaId', 'contactoId', 'itemId'])
export class KamEncuestaRespuesta {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'encuesta_id', type: 'bigint', unsigned: true })
  encuestaId: number;

  @Column({ name: 'contacto_id', type: 'bigint', unsigned: true })
  contactoId: number;

  @Column({ name: 'item_id', type: 'bigint', unsigned: true })
  itemId: number;

  @Column({ type: 'tinyint', unsigned: true, nullable: true })
  puntaje: number | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @ManyToOne(() => KamEncuesta, (encuesta) => encuesta.respuestas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'encuesta_id' })
  encuesta: KamEncuesta;

  @ManyToOne(() => Contacto, { nullable: false })
  @JoinColumn({ name: 'contacto_id' })
  contacto: Contacto;

  @ManyToOne(() => FormatoEncuestaItem, (item) => item.respuestas, {
    nullable: false,
  })
  @JoinColumn({ name: 'item_id' })
  item: FormatoEncuestaItem;
}
