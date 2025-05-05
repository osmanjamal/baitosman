// custom-dev.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Eliminar la base de datos SQLite si existe
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
try {
  if (fs.existsSync(dbPath)) {
    console.log('Eliminando base de datos existente...');
    fs.unlinkSync(dbPath);
  }

  // Eliminar directorio migrations si existe
  const migrationsPath = path.join(__dirname, 'prisma', 'migrations');
  if (fs.existsSync(migrationsPath)) {
    console.log('Eliminando carpeta migrations...');
    fs.rmSync(migrationsPath, { recursive: true, force: true });

    // Recrear directorio migrations vacío
    fs.mkdirSync(migrationsPath);
  }

  // Crear archivo migration_lock.toml
  const lockPath = path.join(migrationsPath, 'migration_lock.toml');
  fs.writeFileSync(lockPath, 'provider = "sqlite"\n');

  console.log('Configurando una nueva base de datos con db push...');
  // Ejecutar prisma db push para configurar la base de datos desde cero
  const dbPush = spawn('npx', ['prisma', 'db', 'push', '--force-reset'], {
    stdio: 'inherit',
    shell: true
  });

  dbPush.on('exit', (code) => {
    if (code !== 0) {
      console.error('Error al inicializar la base de datos');
      process.exit(1);
    }

    console.log('Base de datos inicializada correctamente');
    console.log('Iniciando aplicación Shopify...');

    // Una vez inicializada la base de datos, iniciamos el servidor con un patch para evitar migrate deploy
    const env = process.env;
    env.SHOPIFY_CLI_NO_DB_MIGRATE = 'true'; // Esta es una variable especial para el CLI de Shopify

    const app = spawn('shopify', ['app', 'dev', '--skip-dependencies-installation'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...env,
        // Estas variables ayudan a prevenir la migración
        SKIP_PRISMA_MIGRATE: 'true',
        DB_MIGRATE: 'false'
      }
    });

    app.on('exit', (code) => {
      process.exit(code);
    });
  });
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
