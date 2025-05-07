import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('بدء عملية بذر قاعدة البيانات...');

  // إنشاء فروع تجريبية
  const branches = [
    {
      name: "الدهان",
      description: "فرع الدهان الرئيسي",
      address: "شارع الرئيسي، الدهان",
      deviceId: "device_dahan_main"
    },
    {
      name: "النخيل",
      description: "فرع النخيل",
      address: "شارع النخيل، حي النخيل",
      deviceId: "device_nakheel_main"
    },
    {
      name: "الزيت",
      description: "فرع الزيت",
      address: "شارع الزيت، حي الزيت",
      deviceId: "device_zait_main"
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
