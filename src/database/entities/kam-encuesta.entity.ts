import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FormatoEncuesta } from './formato-encuesta.entity';
import { KamEncuestaContacto } from './kam-encuesta-contacto.entity';
import { KamEncuestaRespuesta } from './kam-encuesta-respuesta.entity';
import { KamRonda } from './kam-ronda.entity';

@Entity('kam_encuestas')
export class KamEncuesta {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'ronda_id', type: 'bigint', unsigned: true })
  rondaId: number;

  @Column({ name: 'formato_encuesta_id', type: 'bigint', unsigned: true })
  formatoEncuestaId: number;

  @Column({ type: 'text', nullable: true })
  veredicto: string | null;

  @Column({ name: 'veredicto_editado', type: 'boolean', default: false })
  veredictoEditado: boolean;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @ManyToOne(() => KamRonda, (ronda) => ronda.encuestas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ronda_id' })
  ronda: KamRonda;

  @ManyToOne(() => FormatoEncuesta, { nullable: false })
  @JoinColumn({ name: 'formato_encuesta_id' })
  formato: FormatoEncuesta;

  @OneToMany(() => KamEncuestaContacto, (item) => item.encuesta)
  contactos: KamEncuestaContacto[];

  @OneToMany(() => KamEncuestaRespuesta, (respuesta) => respuesta.encuesta)
  respuestas: KamEncuestaRespuesta[];
}
