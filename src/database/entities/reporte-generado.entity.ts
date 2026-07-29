import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Pais } from './pais.entity';

@Entity('reportes_generados')
@Unique('uk_reporte_periodo', ['tipo', 'periodo', 'paisId'])
export class ReporteGenerado {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  tipo: string;

  @Column({ type: 'char', length: 7 })
  periodo: string;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
  rutaArchivo: string;

  @Column({ name: 'tamano_bytes', type: 'int', unsigned: true, default: 0 })
  tamanoBytes: number;

  @Column({
    name: 'generado_en',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  generadoEn: Date;

  @Column({ name: 'generado_por', type: 'varchar', length: 20, default: 'job_mensual' })
  generadoPor: string;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;
}
