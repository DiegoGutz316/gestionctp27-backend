import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';

/**
 * Acceso a datos de usuarios.
 * Los Backlogs 1.2 a 1.5 amplian este servicio con crear / editar / desactivar.
 */
@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  /**
   * Unico metodo que trae el hash de la contrasena (la columna tiene
   * select: false). Uso exclusivo del proceso de autenticacion.
   */
  buscarParaAutenticar(correo: string): Promise<Usuario | null> {
    return this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .where('usuario.correo = :correo', {
        correo: correo.trim().toLowerCase(),
      })
      .getOne();
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.usuarios.findOne({ where: { id } });
  }

  /** Deja rastro del ultimo ingreso exitoso (auditoria). */
  async registrarUltimoAcceso(id: string): Promise<void> {
    await this.usuarios.update(id, { ultimoAcceso: new Date() });
  }
}
