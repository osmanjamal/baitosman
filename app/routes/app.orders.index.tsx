// app/routes/app.orders.index.tsx
import { useState, useCallback, useMemo } from "react";
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

  // جلب أحدث 50 طلب للعرض الأولي
  const recentOrders = await prisma.order.findMany({
    take: 50,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      branch: {
        select: {
          name: true
        }
      }
    }
  });

  return json({
    branches,
    recentOrders
  });
}

export default function OrdersIndex() {
  const { branches, recentOrders } = useLoaderData();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);
  const [orders, setOrders] = useState(recentOrders);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    {
      id: "all",
      content: "جميع الطلبات",
      accessibilityLabel: "جميع الطلبات",
      panelID: "all-orders",
    },
    {
      id: "pending",
      content: "معلقة",
      accessibilityLabel: "الطلبات المعلقة",
      panelID: "pending-orders",
    },
    {
      id: "processing",
      content: "قيد التحضير",
      accessibilityLabel: "الطلبات قيد التحضير",
      panelID: "processing-orders",
    },
    {
      id: "completed",
      content: "مكتملة",
      accessibilityLabel: "الطلبات المكتملة",
      panelID: "completed-orders",
    },
    {
      id: "cancelled",
      content: "ملغية",
      accessibilityLabel: "الطلبات الملغية",
      panelID: "cancelled-orders",
    }
  ];

  // استخدام useMemo لتجنب إعادة إنشاء الكائن في كل عملية رندر
  const statusMap = useMemo(() => ({
    0: "", // الكل
    1: "PENDING", // معلق
    2: "PREPARING", // قيد التحضير
    3: "COMPLETED", // مكتمل
    4: "CANCELLED" // ملغي
  }), []);

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
    setSelectedStatus(statusMap[selectedTabIndex]);

    // تحديث قائمة الطلبات بناءً على التبويب المحدد
    fetchOrders(selectedBranchId, statusMap[selectedTabIndex]);
  }, [selectedBranchId, statusMap]);

  const handleBranchChange = useCallback((value) => {
    setSelectedBranchId(value);

    // تحديث قائمة الطلبات بناءً على الفرع المحدد
    fetchOrders(value, selectedStatus);
  }, [selectedStatus]);

  const fetchOrders = async (branchId, status) => {
    setIsLoading(true);

    try {
      let url = '/api/orders';
      const params = new URLSearchParams();

      if (branchId) {
        params.append('branchId', branchId);
      }

      if (status) {
        params.append('status', status);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const branchOptions = [
    { label: "جميع الفروع", value: "" },
    ...branches.map(branch => ({
      label: branch.name,
      value: branch.id
    }))
  ];

  // تصفية الطلبات بناءً على معايير التصفية
  const filteredOrders = orders.filter(order => {
    // تصفية حسب الحالة
    const statusFilter = !selectedStatus || order.status === selectedStatus;

    // تصفية حسب الفرع
    const branchFilter = !selectedBranchId || order.branchId === selectedBranchId;

    return statusFilter && branchFilter;
  });

  // الحصول على شارة الحالة
  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { content: "معلق", status: "warning" },
      PREPARING: { content: "قيد التحضير", status: "info" },
      READY: { content: "جاهز", status: "success" },
      COMPLETED: { content: "مكتمل", status: "success" },
      CANCELLED: { content: "ملغي", status: "critical" }
    };

    const config = statusConfig[status] || { content: status, status: "default" };

    return <Badge status={config.status}>{config.content}</Badge>;
  };

  // تنسيق بيانات الطلبات للعرض في الجدول
  const rows = filteredOrders.map(order => [
    <Link key={`number-${order.id}`} to={`/app/orders/${order.id}`}>{order.orderNumber}</Link>,
    order.branch?.name || "-",
    order.customerName || "غير محدد",
    getStatusBadge(order.status),
    new Date(order.createdAt).toLocaleString('ar-SA'),
    `${order.totalAmount.toFixed(2)} ريال`,
    <div key={`actions-${order.id}`} style={{ display: 'flex', gap: '8px' }}>
      <Button url={`/app/orders/${order.id}`} size="slim">
        عرض
      </Button>
      {order.status === "PENDING" && (
        <Button url={`/app/orders/${order.id}/prepare`} size="slim" primary>
          بدء التحضير
        </Button>
      )}
      {order.status === "PREPARING" && (
        <Button url={`/app/orders/${order.id}/complete`} size="slim" primary>
          إكمال
        </Button>
      )}
      {(order.status === "PENDING" || order.status === "PREPARING") && (
        <Button url={`/app/orders/${order.id}/cancel`} size="slim" tone="critical">
          إلغاء
        </Button>
      )}
    </div>
  ]);

  return (
    <Page
      title="إدارة الطلبات"
    >
      <TitleBar title="إدارة الطلبات" />
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
                    <p>جاري تحميل الطلبات...</p>
                  </div>
                </Card.Section>
              ) : filteredOrders.length === 0 ? (
                <Card.Section>
                  <EmptyState
                    heading="لا توجد طلبات"
                    image=""
                  >
                    <p>لا توجد طلبات تطابق معايير البحث.</p>
                  </EmptyState>
                </Card.Section>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text", "text", "text"]}
                  headings={["رقم الطلب", "الفرع", "العميل", "الحالة", "التاريخ", "المبلغ", "الإجراءات"]}
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
