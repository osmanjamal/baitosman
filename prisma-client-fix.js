const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('بدء عملية إصلاح عميل Prisma...');

// حذف ملفات Prisma المؤقتة
const nodeModulesPrismaPath = path.join(__dirname, 'node_modules', '.prisma');
const prismaClientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');

try {
  if (fs.existsSync(nodeModulesPrismaPath)) {
    console.log('حذف مجلد .prisma...');
    fs.rmSync(nodeModulesPrismaPath, { recursive: true, force: true });
  }

  console.log('إعادة توليد عميل Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('تم إصلاح عميل Prisma بنجاح!');
} catch (error) {
  console.error('حدث خطأ أثناء إصلاح عميل Prisma:', error);
  process.exit(1);
}
