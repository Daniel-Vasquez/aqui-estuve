import { auth, ADMIN_EMAIL } from '../src/lib/auth';
import { client, db } from '../src/lib/db';

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrador';
  if (!password) throw new Error('Define ADMIN_PASSWORD en .env para ejecutar el seed.');

  const existing = await db.collection('user').findOne({});
  if (existing) {
    console.log(`ℹ Ya existe un usuario (${existing.email}). No se crea ninguno nuevo.`);
    return;
  }

  // Llamada directa (no HTTP): el middleware no interviene; el hook valida ADMIN_EMAIL.
  await auth.api.signUpEmail({ body: { email: ADMIN_EMAIL, password, name } });

  // Con autoSignIn: false, Better Auth responde con un usuario ficticio si el hook
  // rechaza el alta (anti-enumeración): hay que confirmar en la BD.
  const created = await db.collection('user').findOne({ email: ADMIN_EMAIL });
  if (!created) throw new Error('Better Auth no creó el usuario (rechazado por el hook).');
  console.log(`✔ Administrador creado: ${ADMIN_EMAIL}`);
  console.log('  Ya puedes borrar ADMIN_PASSWORD de tu .env');
}

main()
  .catch((err) => {
    console.error('✖ Error en seed:', err);
    process.exitCode = 1;
  })
  .finally(() => client.close());
