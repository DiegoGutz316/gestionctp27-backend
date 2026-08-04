import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { Rol } from '../entities/rol.entity';
import { Usuario } from '../entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,

    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
  ) {}

  async crear(
    crearUsuarioDto: CrearUsuarioDto,
    creadoPor: string | null = null,
  ) {
    const correoNormalizado = crearUsuarioDto.correo.trim().toLowerCase();

    const usuarioExistente = await this.usuariosRepository.findOne({
      where: {
        correo: correoNormalizado,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo',
      );
    }

    const rol = await this.rolesRepository.findOne({
      where: {
        id: crearUsuarioDto.rolId,
        activo: true,
      },
    });

    if (!rol) {
      throw new NotFoundException('El rol indicado no existe o está inactivo');
    }

    const contrasenaHash: string = await bcrypt.hash(
      crearUsuarioDto.contrasena,
      12,
    );

    const usuario = this.usuariosRepository.create({
      nombre: crearUsuarioDto.nombre.trim(),
      correo: correoNormalizado,
      contrasenaHash,
      rol,
      activo: crearUsuarioDto.activo ?? true,
      creadoPor,
    });

    const usuarioGuardado = await this.usuariosRepository.save(usuario);

    return {
      id: usuarioGuardado.id,
      nombre: usuarioGuardado.nombre,
      correo: usuarioGuardado.correo,
      rol: usuarioGuardado.rol,
      activo: usuarioGuardado.activo,
      creadoPor: usuarioGuardado.creadoPor,
      creadoEn: usuarioGuardado.creadoEn,
      actualizadoEn: usuarioGuardado.actualizadoEn,
    };
  }
}
