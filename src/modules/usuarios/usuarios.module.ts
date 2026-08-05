import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './services/usuarios.service';

/**
 * Backlog 1.1: solo se expone el acceso a datos, que consume AuthModule.
 * Los controladores llegan con los Backlogs 1.2 a 1.5.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [],
  providers: [UsuariosService],
  exports: [UsuariosService, TypeOrmModule],
})
export class UsuariosModule {}
