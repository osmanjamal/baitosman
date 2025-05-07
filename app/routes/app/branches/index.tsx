// app/routes/app/branches/index.tsx
import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  DataTable,
  EmptyState,
  Layout,
  Text,
  Filters,
  Badge,
  Tabs
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../../shopify.server";
import { prisma } from "../../../db.server";

export async function loader({ request }) {
  await authenticate.admin(request);

  // جلب جميع الفروع مع عدد الطلبات والعناصر لكل فرع
  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: {
          orders: true,
          menuItems: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return json({ branches });
}

export default function BranchesIndex() {
  const { branches } = useLoaderData();
  const [selectedTab, setSelectedTab] = useState(0);

  // التبديل بين التبويبات: الفروع النشطة / جميع الفروع
  const handleTabChange = (selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  };

  const tabs = [
    {
      id: "active",
      content: "الفروع النشطة",
      accessibilityLabel: "الفروع النشطة",
      panelID: "active-branches",
    },
    {
      id: "all",
      content: "جميع الفروع",
      accessibilityLabel: "جميع الفروع",
      panelID: "all-branches",
    },
  ];

  // تصفية الفروع بناءً على التبويب المحدد
  const filteredBranches = selectedTab === 0
    ? branches.filter(branch => branch.isActive !== false)
    : branches;

  // إذا لم تكن هناك فروع، عرض حالة فارغة
  if (!filteredBranches || filteredBranches.length === 0) {
    return (
      <Page
        title="إدارة الفروع"
        primaryAction={
          <Button primary url="/app/branches/new">
            إضافة فرع
          </Button>
        }
      >
        <TitleBar title="إدارة الفروع" />
        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
              <Card>
                <EmptyState
                  heading="لا توجد فروع حتى الآن"
                  image=""
                  action={{
                    content: 'إضافة فرع',
                    url: '/app/branches/new'
                  }}
                >
                  <p>أضف فروعك لبدء إدارة القوائم والطلبات لكل فرع.</p>
                </EmptyState>
              </Card>
            </Tabs>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  // تنسيق بيانات الفروع للعرض في الجدول
  const rows = filteredBranches.map(branch => [
    <Link key={`name-${branch.id}`} to={`/app/branches/${branch.id}`}>{branch.name}</Link>,
    branch.description || "-",
    branch.address || "-",
    branch.isActive === false ?
      <Badge status="critical">غير نشط</Badge> :
      <Badge status="success">نشط</Badge>,
    branch._count.menuItems,
    branch._count.orders,
    <div key={`actions-${branch.id}`} style={{ display: 'flex', gap: '8px' }}>
      <Button url={`/app/branches/${branch.id}`} size="slim">
        تعديل
      </Button>
      <Button url={`/app/branches/${branch.id}/menu`} size="slim">
        قائمة الطعام
      </Button>
      <Button url={`/app/branches/${branch.id}/orders`} size="slim">
        الطلبات
      </Button>
    </div>
  ]);

  return (
    <Page
      title="إدارة الفروع"
      primaryAction={
        <Button primary url="/app/branches/new">
          إضافة فرع
        </Button>
      }
    >
      <TitleBar title="إدارة الفروع" />
      <Layout>
        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Card>
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "numeric", "numeric", "text"]}
                headings={["الاسم", "الوصف", "العنوان", "الحالة", "عناصر القائمة", "الطلبات", "الإجراءات"]}
                rows={rows}
              />
            </Card>
          </Tabs>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
