import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Contacto } from './contacto.entity';
import { Proceso } from './proceso.entity';

@Entity('proceso_contactos')
export class ProcesoContacto {
  @PrimaryColumn({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @PrimaryColumn({ name: 'contacto_id', type: 'bigint', unsigned: true })
  contactoId: number;

  @CreateDateColumn({ name: 'fecha_asociacion', type: 'datetime' })
  fechaAsociacion: Date;

  @ManyToOne(() => Proceso, (proceso) => proceso.procesoContactos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => Contacto, { nullable: false })
  @JoinColumn({ name: 'contacto_id' })
  contacto: Contacto;
}
