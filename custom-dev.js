// custom-dev.js
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على المسار الحالي
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// معلومات تسجيل
console.log('بدء سكربت التطوير المخصص...');
console.log('المسار الحالي:', __dirname);

// المسارات المهمة
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const migrationsPath = path.join(__dirname, 'prisma', 'migrations');
const lockPath = path.join(__dirname, 'prisma', 'migrations', 'migration_lock.toml');

// حذف قاعدة البيانات الحالية إذا طلب المستخدم ذلك
async function resetDatabase() {
  try {
    // التحقق مما إذا كان هناك معلمة --reset-db
    const shouldResetDb = process.argv.includes('--reset-db');

    if (shouldResetDb) {
      console.log('تم طلب إعادة تعيين قاعدة البيانات...');

      // حذف قاعدة البيانات الحالية إذا كانت موجودة
      if (fs.existsSync(dbPath)) {
        console.log('حذف قاعدة البيانات الحالية...');
        fs.unlinkSync(dbPath);
        console.log('تم حذف قاعدة البيانات بنجاح.');
      } else {
        console.log('قاعدة البيانات غير موجودة بالفعل.');
      }

      // التأكد من وجود ملف القفل
      fs.mkdirSync(migrationsPath, { recursive: true });

      if (!fs.existsSync(lockPath)) {
        console.log('إنشاء ملف قفل الهجرة...');
        fs.writeFileSync(lockPath, 'provider = "sqlite"\n');
      }
    } else {
      console.log('تخطي إعادة تعيين قاعدة البيانات. استخدم --reset-db لإعادة تعيين قاعدة البيانات.');
    }
  } catch (error) {
    console.error('خطأ أثناء إعادة تعيين قاعدة البيانات:', error);
    throw error;
  }
}

// تطبيق نموذج قاعدة البيانات (db push)
async function pushDatabaseSchema() {
  return new Promise((resolve, reject) => {
    console.log('تطبيق نموذج قاعدة البيانات باستخدام prisma db push...');

    const dbPush = spawn('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
      stdio: 'inherit',
      shell: true
    });

    dbPush.on('exit', (code) => {
      if (code !== 0) {
        const error = new Error(`فشل تنفيذ prisma db push مع كود الخروج ${code}`);
        console.error(error.message);
        reject(error);
      } else {
        console.log('تم تطبيق نموذج قاعدة البيانات بنجاح.');
        resolve();
      }
    });
  });
}

// توليد عميل Prisma
async function generatePrismaClient() {
  return new Promise((resolve, reject) => {
    console.log('توليد عميل Prisma...');

    const generate = spawn('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      shell: true
    });

    generate.on('exit', (code) => {
      if (code !== 0) {
        const error = new Error(`فشل تنفيذ prisma generate مع كود الخروج ${code}`);
        console.error(error.message);
        reject(error);
      } else {
        console.log('تم توليد عميل Prisma بنجاح.');
        resolve();
      }
    });
  });
}

// تشغيل تطبيق Shopify
async function runShopifyApp() {
  return new Promise((resolve, reject) => {
    console.log('بدء تشغيل تطبيق Shopify...');

    // تعيين متغيرات البيئة لتخطي هجرة قاعدة البيانات
    const env = {
      ...process.env,
      SHOPIFY_CLI_NO_DB_MIGRATE: 'true',
      SKIP_PRISMA_MIGRATE: 'true',
      DB_MIGRATE: 'false'
    };

    // بدء تشغيل التطبيق مع معلمات
    const args = ['app', 'dev', '--skip-dependencies-installation'];

    // إضافة معلمات إضافية من سطر الأوامر
    const additionalArgs = process.argv.slice(2).filter(arg => arg !== '--reset-db');
    if (additionalArgs.length > 0) {
      args.push(...additionalArgs);
    }

    console.log('تنفيذ الأمر:', 'shopify', args.join(' '));

    const app = spawn('shopify', args, {
      stdio: 'inherit',
      shell: true,
      env
    });

    app.on('exit', (code) => {
      if (code !== 0) {
        const error = new Error(`تم إنهاء تطبيق Shopify مع كود الخروج ${code}`);
        console.error(error.message);
        reject(error);
      } else {
        console.log('تم إنهاء تطبيق Shopify بنجاح.');
        resolve();
      }
    });
  });
}

// الدالة الرئيسية
async function main() {
  try {
    // إعادة تعيين قاعدة البيانات إذا طلب المستخدم ذلك
    await resetDatabase();

    // تطبيق نموذج قاعدة البيانات
    await pushDatabaseSchema();

    // توليد عميل Prisma
    await generatePrismaClient();

    // تشغيل تطبيق Shopify
    await runShopifyApp();
  } catch (error) {
    console.error('حدث خطأ أثناء بدء التطوير:', error);
    process.exit(1);
  }
}

// بدء تنفيذ السكربت
main();
