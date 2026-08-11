import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EstadoKamRonda } from '../../common/enums/estado-kam-ronda.enum';
import { Kam } from './kam.entity';
import { KamEncuesta } from './kam-encuesta.entity';
import { KamRondaBitacora } from './kam-ronda-bitacora.entity';
import { KamRondaCorrespondencia } from './kam-ronda-correspondencia.entity';
import { Usuario } from './usuario.entity';

@Entity('kam_rondas')
@Unique('uk_kam_rondas_numero', ['kamId', 'numero'])
export class KamRonda {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'kam_id', type: 'bigint', unsigned: true })
  kamId: number;

  @Column({ type: 'smallint', unsigned: true })
  numero: number;

  @Column({
    type: 'enum',
    enum: EstadoKamRonda,
    default: EstadoKamRonda.Pendiente,
  })
  estado: EstadoKamRonda;

  @Column({ name: 'fecha_reunion_socializacion', type: 'date', nullable: true })
  fechaReunionSocializacion: string | null;

  @Column({ type: 'text', nullable: true })
  bitacora: string | null;

  @Column({ type: 'text', nullable: true })
  veredicto: string | null;

  @Column({ name: 'veredicto_editado', type: 'boolean', default: false })
  veredictoEditado: boolean;

  @Column({ name: 'correspondencia_nombre', type: 'varchar', length: 255, nullable: true })
  correspondenciaNombre: string | null;

  @Column({ name: 'correspondencia_ruta', type: 'varchar', length: 500, nullable: true })
  correspondenciaRuta: string | null;

  @Column({ name: 'ejecutado_manual', type: 'boolean', default: false })
  ejecutadoManual: boolean;

  @Column({ name: 'socializado_por_id', type: 'bigint', unsigned: true, nullable: true })
  socializadoPorId: number | null;

  @Column({ name: 'fecha_socializado', type: 'datetime', nullable: true })
  fechaSocializado: Date | null;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @ManyToOne(() => Kam, (kam) => kam.rondas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kam_id' })
  kam: Kam;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'socializado_por_id' })
  socializadoPor: Usuario | null;

  @OneToMany(() => KamEncuesta, (encuesta) => encuesta.ronda)
  encuestas: KamEncuesta[];

  @OneToMany(() => KamRondaCorrespondencia, (item) => item.ronda)
  correspondencias: KamRondaCorrespondencia[];

  @OneToMany(() => KamRondaBitacora, (item) => item.ronda)
  bitacoraEntradas: KamRondaBitacora[];
}
