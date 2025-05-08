// app/routes/app.menu.index.tsx
import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Card,
  Button,
  DataTable,
  EmptyState,
  Layout,
  Select,
  Badge,
  Tabs
} from "@shopify/polaris";

import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export async function loader({ request }) {
  await authenticate.admin(request);

  // جلب جميع الفروع
  const branches = await prisma.branch.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // جلب جميع فئات قائمة الطعام المميزة
  const categories = await prisma.menuItem.groupBy({
    by: ['category'],
    orderBy: {
      category: 'asc'
    }
  });

  return json({
    branches,
    categories: categories.map(c => c.category || 'عام')
  });
}

export default function MenuIndex() {
  const { branches, categories } = useLoaderData();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    {
      id: "available",
      content: "متاح",
      accessibilityLabel: "العناصر المتاحة",
      panelID: "available-menu-items",
    },
    {
      id: "unavailable",
      content: "غير متاح",
      accessibilityLabel: "العناصر غير المتاحة",
      panelID: "unavailable-menu-items",
    },
    {
      id: "all",
      content: "الكل",
      accessibilityLabel: "جميع العناصر",
      panelID: "all-menu-items",
    },
  ];

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  }, []);

  const handleBranchChange = useCallback(async (value) => {
    setSelectedBranchId(value);

    if (value) {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/menu?branchId=${value}&includeUnavailable=true`);
        if (response.ok) {
          const data = await response.json();
          // تحويل البيانات من تنسيق المجموعات إلى مصفوفة مسطحة
          const items = Object.values(data.menu || {}).flat();
          setMenuItems(items);
        } else {
          // التعامل مع الخطأ
          setMenuItems([]);
        }
      } catch (error) {
        console.error("Error fetching menu items:", error);
        setMenuItems([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setMenuItems([]);
    }
  }, []);

  const handleCategoryChange = useCallback((value) => {
    setSelectedCategory(value);
  }, []);

  const branchOptions = [
    { label: "اختر فرعًا", value: "" },
    ...branches.map(branch => ({
      label: branch.name,
      value: branch.id
    }))
  ];

  const categoryOptions = [
    { label: "جميع الفئات", value: "" },
    ...categories.map(category => ({
      label: category,
      value: category
    }))
  ];

  // تصفية عناصر القائمة بناءً على التبويب المحدد والفئة
  const filteredItems = menuItems.filter(item => {
    // تصفية حسب الحالة (متاح/غير متاح/الكل)
    const statusFilter =
      (selectedTab === 0 && item.isAvailable) ||
      (selectedTab === 1 && !item.isAvailable) ||
      (selectedTab === 2);

    // تصفية حسب الفئة
    const categoryFilter = !selectedCategory || item.category === selectedCategory;

    return statusFilter && categoryFilter;
  });

  // إذا لم يتم اختيار فرع، عرض رسالة لاختيار فرع
  if (!selectedBranchId) {
    return (
      <Page
        title="إدارة قائمة الطعام"
        primaryAction={
          <Button primary disabled>
            إضافة عنصر جديد
          </Button>
        }
      >
        <TitleBar title="إدارة قائمة الطعام" />
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <Select
                  label="اختر فرعًا"
                  options={branchOptions}
                  value={selectedBranchId}
                  onChange={handleBranchChange}
                  placeholder="اختر فرعًا لعرض قائمة الطعام"
                />
              </Card.Section>
              <Card.Section>
                <EmptyState
                  heading="اختر فرعًا أولاً"
                  image=""
                >
                  <p>يرجى اختيار فرع لعرض قائمة الطعام الخاصة به.</p>
                </EmptyState>
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const selectedBranch = branches.find(branch => branch.id === selectedBranchId);

  // تنسيق بيانات عناصر القائمة للعرض في الجدول
  const rows = filteredItems.map(item => [
    <Link key={`name-${item.id}`} to={`/app/menu/${item.id}`}>{item.name}</Link>,
    item.category || "عام",
    `${item.price.toFixed(2)} ريال`,
    item.isAvailable ?
      <Badge status="success">متاح</Badge> :
      <Badge status="critical">غير متاح</Badge>,
    <div key={`actions-${item.id}`} style={{ display: 'flex', gap: '8px' }}>
      <Button url={`/app/menu/${item.id}`} size="slim">
        تعديل
      </Button>
      <Button url={`/app/menu/${item.id}/toggle`} size="slim"
        monochrome={item.isAvailable}
        tone={item.isAvailable ? 'critical' : 'success'}>
        {item.isAvailable ? 'إيقاف' : 'تفعيل'}
      </Button>
    </div>
  ]);

  return (
    <Page
      title={`إدارة قائمة الطعام${selectedBranch ? ` - ${selectedBranch.name}` : ''}`}
      primaryAction={
        <Button primary url={`/app/menu/new?branchId=${selectedBranchId}`}>
          إضافة عنصر جديد
        </Button>
      }
    >
      <TitleBar title="إدارة قائمة الطعام" />
      <Layout>
        <Layout.Section>
          <Card>
            <Card.Section>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    label="الفرع"
                    options={branchOptions}
                    value={selectedBranchId}
                    onChange={handleBranchChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="الفئة"
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                  />
                </div>
              </div>
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <Card>
              {isLoading ? (
                <Card.Section>
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>جاري تحميل قائمة الطعام...</p>
                  </div>
                </Card.Section>
              ) : filteredItems.length === 0 ? (
                <Card.Section>
                  <EmptyState
                    heading="لا توجد عناصر"
                    image=""
                    action={{
                      content: 'إضافة عنصر جديد',
                      url: `/app/menu/new?branchId=${selectedBranchId}`
                    }}
                  >
                    <p>لا توجد عناصر في قائمة الطعام تطابق معايير البحث.</p>
                  </EmptyState>
                </Card.Section>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["الاسم", "الفئة", "السعر", "الحالة", "الإجراءات"]}
                  rows={rows}
                />
              )}
            </Card>
          </Tabs>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
