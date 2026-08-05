/**
 * Semilla de usuarios para poder probar el login.
 * Ejecutar con: pnpm seed:usuarios
 *
 * Usa el mismo DataSource de la CLI de TypeORM, asi que respeta la
 * configuracion de src/database/data-source.ts.
 */
import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';

const CONTRASENA_TEMPORAL = 'CTP27.admin2026';

async function sembrar() {
  await AppDataSource.initialize();
  const usuarios = AppDataSource.getRepository(Usuario);

  const hash = await bcrypt.hash(CONTRASENA_TEMPORAL, 12);

  const semillas: Array<Partial<Usuario>> = [
    {
      nombre: 'Administrador del sistema',
      correo: 'admin@ctp27abril.ed.cr',
      contrasenaHash: hash,
      rol: 'ADMINISTRADOR',
      activo: true,
    },
    {
      // Sirve para probar el criterio "usuario inactivo no puede ingresar".
      nombre: 'Docente de prueba (inactivo)',
      correo: 'inactivo@ctp27abril.ed.cr',
      contrasenaHash: hash,
      rol: 'DOCENTE_PECUARIO',
      activo: false,
    },
  ];

  for (const semilla of semillas) {
    const existente = await usuarios.findOne({
      where: { correo: semilla.correo },
    });
    if (existente) {
      console.log(`Ya existe: ${semilla.correo}`);
      continue;
    }
    await usuarios.save(usuarios.create(semilla));
    console.log(`Creado: ${semilla.correo}`);
  }

  console.log(`\nContrasena de ambos usuarios: ${CONTRASENA_TEMPORAL}`);
  await AppDataSource.destroy();
}

sembrar().catch((error) => {
  console.error(error);
  process.exit(1);
});
