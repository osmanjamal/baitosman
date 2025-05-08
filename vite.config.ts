import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// تثبيت المتغيرات العالمية الخاصة بـ Remix
installGlobals({ nativeFetch: true });

// معالجة متغيرات البيئة المتعلقة بـ Shopify
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

// استخراج اسم المضيف من المتغير SHOPIFY_APP_URL
const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname;

// تكوين HMR (Hot Module Replacement) بناءً على المضيف
let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

// تكوين Vite
export default defineConfig({
  server: {
    allowedHosts: [host], // تحديد المضيف المسموح به
    cors: {
      preflightContinue: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig, // تكوين HMR بناءً على المضيف
    fs: {
      allow: ["app", "node_modules"], // السماح باستخدام المجلدات الضرورية
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"], // تجاهل الملفات المخفية
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    tsconfigPaths(), // تفعيل دعم المسارات من ملف tsconfig
  ],
  build: {
    assetsInlineLimit: 0, // لا تقم بتضمين الأصول في الشيفرة المدمجة
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react", "@shopify/polaris"], // تحسين التبعيات
  },
}) satisfies UserConfig;
