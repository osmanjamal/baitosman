import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// تعطيل محاولات الهجرة التلقائية
process.env.SKIP_PRISMA_MIGRATE = "true";

// تكوين تطبيق Shopify
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(",") || ["read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  // تخطي جميع الإجراءات التي قد تؤدي إلى مشاكل هجرة
  skipMigration: true,
});

// تصدير وظائف وثوابت Shopify API
export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

// دالة requireAuth للتحقق من صحة المستخدم
export async function requireAuth(request, options = {}) {
  try {
    const { admin, session } = await authenticate.admin(request, options);
    return { admin, session };
  } catch (error) {
    throw await login(request, options);
  }
}

// وظائف إضافية للتعامل مع نماذج التطبيق
export async function getAllBranches() {
  try {
    return await prisma.branch.findMany();
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
