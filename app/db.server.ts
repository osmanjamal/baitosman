import { PrismaClient } from "@prisma/client";

// تعريف نطاق عالمي للـ PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// إعدادات خيارات Prisma
const prismaOptions = {
  log: process.env.NODE_ENV === "development"
    ? ['error', 'warn']
    : ['error'],
};

// إنشاء مثيل واحد من PrismaClient وإعادة استخدامه عبر طلبات متعددة
let prisma: PrismaClient;

// منع إنشاء مثيلات متعددة في بيئة التطوير
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient(prismaOptions);
  }
  prisma = globalForPrisma.prisma;
}

// تصدير prisma للاستخدام في باقي أجزاء التطبيق
export { prisma };
export default prisma;
