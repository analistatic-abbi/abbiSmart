import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SesionUsuario } from './sesion-usuario.entity';
import { UbicacionGeografica } from './ubicacion-geografica.entity';
import { Usuario } from './usuario.entity';

@Entity('paises')
export class Pais {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Usuario, (usuario) => usuario.pais)
  usuarios: Usuario[];

  @OneToMany(() => SesionUsuario, (sesion) => sesion.paisSesion)
  sesiones: SesionUsuario[];

  @OneToMany(() => UbicacionGeografica, (ubicacion) => ubicacion.pais)
  ubicaciones: UbicacionGeografica[];
}
