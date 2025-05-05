import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على اسم الدليل في وحدات ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تعيين متغيرات البيئة لتجاوز الهجرة
process.env.SKIP_PRISMA_MIGRATE = "true";
process.env.DB_MIGRATE = "false";

// التحقق من وجود قاعدة البيانات
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
if (!fs.existsSync(dbPath)) {
  console.log('إنشاء قاعدة بيانات جديدة...');
  try {
    // دفع المخطط إلى قاعدة البيانات
    execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  } catch (error) {
    console.error('فشل في تهيئة قاعدة البيانات:', error);
    process.exit(1);
  }
}

// تشغيل التطبيق مع تجاوز الهجرة
try {
  execSync('shopify app dev --skip-dependencies-installation', { stdio: 'inherit' });
} catch (error) {
  console.error('فشل في بدء التطبيق:', error);
  process.exit(1);
}
