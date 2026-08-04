import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { IndicadorCodigo } from '../../common/enums/indicador-codigo.enum';
import { FormatoCalificacion } from './formato-calificacion.entity';

@Entity('formato_calificacion_rangos')
@Unique('uk_formato_indicador_orden', ['formatoId', 'indicadorCodigo', 'orden'])
export class FormatoCalificacionRango {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'formato_id', type: 'bigint', unsigned: true })
  formatoId: number;

  @Column({
    name: 'indicador_codigo',
    type: 'enum',
    enum: IndicadorCodigo,
  })
  indicadorCodigo: IndicadorCodigo;

  @Column({ type: 'tinyint', unsigned: true })
  orden: number;

  @Column({
    name: 'rango_min',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  rangoMin: string | null;

  @Column({
    name: 'rango_max',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  rangoMax: string | null;

  @Column({ type: 'int', unsigned: true })
  puntos: number;

  @ManyToOne(() => FormatoCalificacion, (formato) => formato.rangos, {
    nullable: false,
  })
  @JoinColumn({ name: 'formato_id' })
  formato: FormatoCalificacion;
}
