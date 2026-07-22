import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EstadoProyeccion } from '../../common/enums/estado-proyeccion.enum';
import { MercadoProyeccion } from '../../common/enums/mercado-proyeccion.enum';
import { Pais } from './pais.entity';
import { Proceso } from './proceso.entity';
import { Usuario } from './usuario.entity';

@Entity('proyecciones')
@Unique('uk_proyeccion_origen', ['procesoOrigenId'])
@Unique('uk_proyeccion_resultante', ['procesoResultanteId'])
export class Proyeccion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_origen_id', type: 'bigint', unsigned: true, nullable: true })
  procesoOrigenId: number | null;

  @Column({ name: 'proceso_resultante_id', type: 'bigint', unsigned: true, nullable: true })
  procesoResultanteId: number | null;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ name: 'anio_proyectado', type: 'smallint', unsigned: true })
  anioProyectado: number;

  @Column({ name: 'fecha_estimada_publicacion', type: 'date' })
  fechaEstimadaPublicacion: string;

  @Column({ name: 'valor_venta', type: 'decimal', precision: 18, scale: 2 })
  valorVenta: string;

  @Column({ name: 'valor_facturacion', type: 'decimal', precision: 18, scale: 2 })
  valorFacturacion: string;

  @Column({
    type: 'enum',
    enum: EstadoProyeccion,
    default: EstadoProyeccion.LEJANO,
  })
  estado: EstadoProyeccion;

  @Column({ type: 'enum', enum: MercadoProyeccion, nullable: true })
  mercado: MercadoProyeccion | null;

  @Column({
    name: 'fecha_creacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({ type: 'boolean', default: false })
  eliminado: boolean;

  @Column({ name: 'fecha_eliminacion', type: 'datetime', nullable: true })
  fechaEliminacion: Date | null;

  @Column({ name: 'eliminado_por_id', type: 'bigint', unsigned: true, nullable: true })
  eliminadoPorId: number | null;

  @ManyToOne(() => Pais)
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => Proceso, { nullable: true })
  @JoinColumn({ name: 'proceso_origen_id' })
  procesoOrigen: Proceso | null;

  @ManyToOne(() => Proceso, { nullable: true })
  @JoinColumn({ name: 'proceso_resultante_id' })
  procesoResultante: Proceso | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;
}
