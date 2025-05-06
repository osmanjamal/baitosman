// run-dev.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على اسم الدليل في وحدات ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('بدء سكربت التطوير...');

// تعيين متغيرات البيئة لتجاوز الهجرة
process.env.SKIP_PRISMA_MIGRATE = "true";
process.env.DB_MIGRATE = "false";

// التحقق من وجود قاعدة البيانات
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const shouldResetDb = process.argv.includes('--reset-db');

if (shouldResetDb && fs.existsSync(dbPath)) {
  console.log('حذف قاعدة البيانات الحالية...');
  fs.unlinkSync(dbPath);
}

if (!fs.existsSync(dbPath) || shouldResetDb) {
  console.log('إنشاء قاعدة بيانات جديدة...');
  try {
    // التأكد من وجود دليل الهجرات
    const migrationsPath = path.join(__dirname, 'prisma', 'migrations');
    fs.mkdirSync(migrationsPath, { recursive: true });

    // إنشاء ملف قفل الهجرة إذا لم يكن موجودًا
    const lockPath = path.join(migrationsPath, 'migration_lock.toml');
    if (!fs.existsSync(lockPath)) {
      fs.writeFileSync(lockPath, 'provider = "sqlite"\n');
    }

    // توليد عميل Prisma أولاً
    console.log('توليد عميل Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // دفع المخطط إلى قاعدة البيانات
    console.log('دفع مخطط قاعدة البيانات...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    console.log('تم إنشاء قاعدة البيانات بنجاح.');
  } catch (error) {
    console.error('فشل في تهيئة قاعدة البيانات:', error);
    process.exit(1);
  }
}

// تشغيل التطبيق مع تجاوز الهجرة
try {
  console.log('بدء تشغيل تطبيق Shopify...');

  // تجميع المعلمات الإضافية من سطر الأوامر
  const additionalArgs = process.argv.slice(2)
    .filter(arg => arg !== '--reset-db')
    .join(' ');

  const command = `shopify app dev --skip-dependencies-installation ${additionalArgs}`;
  console.log(`تنفيذ: ${command}`);

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      SHOPIFY_CLI_NO_DB_MIGRATE: 'true'
    }
  });
} catch (error) {
  console.error('فشل في بدء التطبيق:', error);
  process.exit(1);
}
