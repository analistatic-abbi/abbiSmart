import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Contacto } from './contacto.entity';
import { KamEncuesta } from './kam-encuesta.entity';

@Entity('kam_encuesta_contactos')
export class KamEncuestaContacto {
  @PrimaryColumn({ name: 'encuesta_id', type: 'bigint', unsigned: true })
  encuestaId: number;

  @PrimaryColumn({ name: 'contacto_id', type: 'bigint', unsigned: true })
  contactoId: number;

  @ManyToOne(() => KamEncuesta, (encuesta) => encuesta.contactos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'encuesta_id' })
  encuesta: KamEncuesta;

  @ManyToOne(() => Contacto, { nullable: false })
  @JoinColumn({ name: 'contacto_id' })
  contacto: Contacto;
}
