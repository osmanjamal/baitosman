import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('بدء عملية بذر قاعدة البيانات...');

  // إنشاء فروع تجريبية
  const branches = [
    {
      name: "الدهان",
      description: "فرع الدهان الرئيسي",
      address: "شارع الرئيسي، الدهان",
      deviceId: "device_dahan_main",
      latitude: 24.774265,
      longitude: 46.738586,
      isActive: true
    },
    {
      name: "النخيل",
      description: "فرع النخيل",
      address: "شارع النخيل، حي النخيل",
      deviceId: "device_nakheel_main",
      latitude: 24.794265,
      longitude: 46.758586,
      isActive: true
    },
    {
      name: "الزيت",
      description: "فرع الزيت",
      address: "شارع الزيت، حي الزيت",
      deviceId: "device_zait_main",
      latitude: 24.744265,
      longitude: 46.718586,
      isActive: true
    }
  ];

  console.log('إنشاء الفروع...');
  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { deviceId: branch.deviceId },
      update: branch,
      create: branch
    });
  }

  // إنشاء عناصر قائمة تجريبية
  console.log('إنشاء عناصر القائمة...');

  // الحصول على معرفات الفروع
  const createdBranches = await prisma.branch.findMany();
  const branchIds = createdBranches.map(branch => branch.id);

  const menuCategories = ['الرئيسية', 'المقبلات', 'الأطباق الرئيسية', 'المشروبات', 'الحلويات'];

  // إنشاء قائمة فرعية لكل فرع
  for (let i = 0; i < branchIds.length; i++) {
    const branchId = branchIds[i];

    for (let j = 0; j < menuCategories.length; j++) {
      const category = menuCategories[j];

      // إنشاء 3 عناصر في كل فئة
      for (let k = 1; k <= 3; k++) {
        await prisma.menuItem.create({
          data: {
            name: `${category} ${k} - فرع ${i + 1}`,
            description: `وصف ${category} ${k} لفرع ${i + 1}`,
            price: Math.floor(Math.random() * 50) + 10, // سعر عشوائي بين 10 و 60
            category: category,
            isAvailable: true,
            branchId: branchId
          }
        });
      }
    }
  }

  // إنشاء إعدادات التطبيق الافتراضية
  console.log('إنشاء إعدادات التطبيق...');
  await prisma.appSettings.upsert({
    where: { id: "settings" },
    update: {},
    create: {
      id: "settings",
      defaultBranchId: branchIds[0],
      orderNotificationEmail: "notifications@baitosman.com",
      enableOrderSound: true,
      minimumOrderAmount: 0,
      currency: "SAR",
      companyName: "بيت عثمان",
      companyLogo: null,
      contactPhone: "+966500000000",
      contactEmail: "info@baitosman.com"
    }
  });

  console.log('تم بذر قاعدة البيانات بنجاح!');
}

main()
  .catch((e) => {
    console.error('خطأ في بذر قاعدة البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

