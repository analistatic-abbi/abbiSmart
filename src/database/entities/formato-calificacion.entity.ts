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
import { Usuario } from './usuario.entity';
import { FormatoCalificacionRango } from './formato-calificacion-rango.entity';

@Entity('formatos_calificacion')
@Unique('uk_formato_pais_nombre', ['paisId', 'nombre'])
export class FormatoCalificacion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ name: 'puntaje_minimo', type: 'int', unsigned: true })
  puntajeMinimo: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'usuario_creo_id', type: 'bigint', unsigned: true })
  usuarioCreoId: number;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({
    name: 'fecha_modificacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_creo_id' })
  usuarioCreo: Usuario;

  @OneToMany(() => FormatoCalificacionRango, (rango) => rango.formato)
  rangos: FormatoCalificacionRango[];
}
