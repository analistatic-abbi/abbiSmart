import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { IndicadorCodigo } from '../../common/enums/indicador-codigo.enum';
import { FormatoCalificacionRango } from './formato-calificacion-rango.entity';
import { ParametroFinanciero } from './parametro-financiero.entity';
import { ProcesoCalificacion } from './proceso-calificacion.entity';

@Entity('proceso_calificacion_detalle')
@Unique('uk_calificacion_detalle_indicador', [
  'procesoCalificacionId',
  'indicadorCodigo',
])
export class ProcesoCalificacionDetalle {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_calificacion_id', type: 'bigint', unsigned: true })
  procesoCalificacionId: number;

  @Column({
    name: 'indicador_codigo',
    type: 'enum',
    enum: IndicadorCodigo,
  })
  indicadorCodigo: IndicadorCodigo;

  @Column({ name: 'parametro_financiero_id', type: 'bigint', unsigned: true })
  parametroFinancieroId: number;

  @Column({ name: 'valor_abbi', type: 'decimal', precision: 18, scale: 4 })
  valorAbbi: string;

  @Column({ name: 'formato_rango_id', type: 'bigint', unsigned: true })
  formatoRangoId: number;

  @Column({ name: 'puntos_obtenidos', type: 'int', unsigned: true })
  puntosObtenidos: number;

  @ManyToOne(() => ProcesoCalificacion, (cal) => cal.detalle, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proceso_calificacion_id' })
  procesoCalificacion: ProcesoCalificacion;

  @ManyToOne(() => ParametroFinanciero, { nullable: false })
  @JoinColumn({ name: 'parametro_financiero_id' })
  parametroFinanciero: ParametroFinanciero;

  @ManyToOne(() => FormatoCalificacionRango, { nullable: false })
  @JoinColumn({ name: 'formato_rango_id' })
  formatoRango: FormatoCalificacionRango;
}
