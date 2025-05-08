import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";

import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "./db.server";

// تحديد المتغيرات البيئية الإلزامية
const requiredEnvVars = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_APP_URL",
];

// التحقق من وجود المتغيرات البيئية المطلوبة
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${envVar}`);
    } else {
      console.warn(`Warning: Missing environment variable: ${envVar}`);
    }
  }
});

// تكوين تطبيق Shopify بشكل محسن
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: process.env.SCOPES?.split(",") || [
    "read_products",
    "write_products",
    "read_orders",
    "write_orders",
    "read_customers",
    "write_customers"
  ],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/app/uninstalled",
    },
    ORDERS_CREATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/orders/create",
    },
    PRODUCTS_UPDATE: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks/products/update",
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  // تخطي جميع الإجراءات التي قد تؤدي إلى مشاكل هجرة
  skipMigration: true,
  hooks: {
    afterAuth: async (context) => {
      const { session } = context;
      if (!session?.id) return;

      // قد نحتاج إلى تنفيذ أي عمليات إضافية بعد المصادقة
      try {
        // مثال: تسجيل التثبيت الناجح
        console.log(`App successfully installed on shop: ${session.shop}`);
      } catch (error) {
        console.error("Error in afterAuth hook:", error);
      }
    },
  },
});

// تصدير وظائف وثوابت Shopify API
export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// دالة محسنة للتحقق من صحة المستخدم مع معالجة الاستثناءات
export async function requireAuth(request, options = {}) {
  try {
    const { session } = await authenticate.admin(request, options);
    return { session };
  } catch (error) {
    console.error("Authentication error:", error);
    throw await login(request, options);
  }
}


// وظائف إضافية للتعامل مع نماذج التطبيق
export async function getAllBranches() {
  try {
    return await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return [];
  }
}

export async function getBranchById(id) {
  try {
    return await prisma.branch.findUnique({
      where: { id },
      include: { menuItems: true }
    });
  } catch (error) {
    console.error(`Error fetching branch with id ${id}:`, error);
    return null;
  }
}

// دالة لجلب إعدادات التطبيق
export async function getAppSettings() {
  try {
    let settings = await prisma.appSettings.findUnique({
      where: { id: "settings" }
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          id: "settings",
          defaultBranchId: null,
          orderNotificationEmail: null,
          enableOrderSound: true,
          minimumOrderAmount: 0
        }
      });
    }

    return settings;
  } catch (error) {
    console.error("Error fetching app settings:", error);
    // قيم افتراضية في حالة الخطأ
    return {
      id: "settings",
      defaultBranchId: null,
      orderNotificationEmail: null,
      enableOrderSound: true,
      minimumOrderAmount: 0
    };
  }
}
