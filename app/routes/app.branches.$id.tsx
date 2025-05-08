// app/routes/app.branches.$id.tsx
import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,

  DataTable,
  Badge,
  EmptyState
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request, params }) {
  try {
    await requireAuth(request);

    const { id } = params;

    if (!id) {
      return redirect("/app/branches");
    }

    // جلب بيانات الفرع مع عناصر القائمة والإحصائيات
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        menuItems: {
          orderBy: {
            category: 'asc'
          }
        },
        _count: {
          select: {
            orders: true,
            menuItems: true
          }
        }
      }
    });

    if (!branch) {
      return redirect("/app/branches");
    }

    // جلب إحصائيات الطلبات للفرع
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      where: { branchId: id },
      _count: true,
      _sum: {
        totalAmount: true
      }
    });

    // جلب آخر 5 طلبات للفرع
    const recentOrders = await prisma.order.findMany({
      where: { branchId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    // جلب فئات القائمة مع عدد العناصر
    const menuCategories = await prisma.menuItem.groupBy({
      by: ['category'],
      where: { branchId: id },
      _count: true
    });

    return json({
      branch: {
        ...branch,
        _count: undefined,
        ordersCount: branch._count.orders,
        menuItemsCount: branch._count.menuItems
      },
      stats: {
        orderStats,
        menuCategories,
        totalRevenue: orderStats.reduce((acc, curr) => acc + (curr._sum.totalAmount || 0), 0)
      },
      recentOrders
    });
  } catch (error) {
    console.error("Error loading branch details:", error);
    return json({ error: "Failed to load branch details" }, { status: 500 });
  }
}

export async function action({ request, params }) {
  try {
    await requireAuth(request);

    const { id } = params;
    const formData = await request.formData();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const address = formData.get("address") as string;
    const deviceId = formData.get("deviceId") as string;
    const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
    const isActive = formData.get("isActive") === "true";

    // التحقق من البيانات المطلوبة
    if (!name || !deviceId) {
      return json(
        { errors: {
          name: !name ? "اسم الفرع مطلوب" : null,
          deviceId: !deviceId ? "معرف الجهاز مطلوب" : null
        }},
        { status: 400 }
      );
    }

    // التحقق من عدم استخدام معرف الجهاز بالفعل
    const existingBranch = await prisma.branch.findFirst({
      where: {
        deviceId,
        id: { not: id }
      }
    });

    if (existingBranch) {
      return json(
        { errors: { deviceId: "معرف الجهاز مستخدم بالفعل في فرع آخر" }},
        { status: 400 }
      );
    }

    try {
      // تحديث بيانات الفرع
      const branch = await prisma.branch.update({
        where: { id },
        data: {
          name,
          description,
          address,
          deviceId,
          latitude,
          longitude,
          isActive
        }
      });

      return json({ branch, success: true });
    } catch (error) {
      console.error("Error updating branch:", error);
      return json({ errors: { form: "فشل في تحديث بيانات الفرع" }}, { status: 500 });
    }
  } catch (error) {
    console.error("General error in action:", error);
    return json({ errors: { form: "حدث خطأ غير متوقع" }}, { status: 500 });
  }
}

export default function BranchDetail() {
  const loaderData = useLoaderData();
  const { branch, stats, recentOrders } = loaderData;
  const actionData = useActionData();
  const submit = useSubmit();

  const [name, setName] = useState(branch.name);
  const [description, setDescription] = useState(branch.description || "");
  const [address, setAddress] = useState(branch.address || "");
  const [deviceId, setDeviceId] = useState(branch.deviceId);
  const [latitude, setLatitude] = useState(branch.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(branch.longitude?.toString() || "");
  const [isActive, setIsActive] = useState(branch.isActive !== false);
  const [showToast, setShowToast] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
    }
  }, [actionData]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("deviceId", deviceId);
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("isActive", isActive.toString());

    submit(formData, { method: "post" });
  };

  const handleTabChange = (tabIndex) => setSelectedTab(tabIndex);

  // تحويل بيانات العناصر للعرض في الجدول
  const menuItemRows = branch.menuItems.map(item => [
    item.name,
    item.category || "عام",
    `$${item.price.toFixed(2)}`,
    item.isAvailable ? <Badge status="success">متاح</Badge> : <Badge status="critical">غير متاح</Badge>,
    <Button url={`/app/menu/${item.id}`} size="slim">تعديل</Button>
  ]);

  // تحويل بيانات الطلبات الأخيرة للعرض في الجدول
  const orderStatusMap = {
    PENDING: { content: "معلق", status: "warning" },
    PREPARING: { content: "قيد التحضير", status: "info" },
    READY: { content: "جاهز", status: "success" },
    COMPLETED: { content: "مكتمل", status: "success" },
    CANCELLED: { content: "ملغي", status: "critical" }
  };

  const recentOrderRows = recentOrders.map(order => [
    order.orderNumber,
    new Date(order.createdAt).toLocaleString(),
    order.customerName || "-",
    <Badge status={orderStatusMap[order.status].status}>{orderStatusMap[order.status].content}</Badge>,
    `$${order.totalAmount.toFixed(2)}`,
    <Button url={`/app/orders/${order.id}`} size="slim">عرض</Button>
  ]);

  // بناء محتوى علامات التبويب
  const tabs = [
    {
      id: "details",
      content: "تفاصيل الفرع",
      accessibilityLabel: "تفاصيل الفرع",
      panelID: "details-content",
    },
    {
      id: "menu",
      content: "قائمة الطعام",
      accessibilityLabel: "قائمة الطعام",
      panelID: "menu-content",
    },
    {
      id: "orders",
      content: "الطلبات الأخيرة",
      accessibilityLabel: "الطلبات الأخيرة",
      panelID: "orders-content",
    },
    {
      id: "stats",
      content: "الإحصائيات",
      accessibilityLabel: "الإحصائيات",
      panelID: "stats-content",
    },
  ];

  return (
    <Page
      title={`تعديل الفرع: ${branch.name}`}
      backAction={{ content: "الفروع", url: "/app/branches" }}
    >
      <TitleBar title={`تعديل الفرع: ${branch.name}`} />

      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      {showToast && (
        <Toast
          content="تم تحديث بيانات الفرع بنجاح"
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
        {selectedTab === 0 && (
          <Layout>
            <Layout.Section>
              <Card>
                <Form method="post" onSubmit={handleSubmit}>
                  <FormLayout>
                    <TextField
                      label="اسم الفرع"
                      value={name}
                      onChange={setName}
                      autoComplete="off"
                      error={actionData?.errors?.name}
                      requiredIndicator
                    />

                    <TextField
                      label="الوصف"
                      value={description}
                      onChange={setDescription}
                      multiline={3}
                      autoComplete="off"
                    />

                    <TextField
                      label="العنوان"
                      value={address}
                      onChange={setAddress}
                      autoComplete="off"
                    />

                    <FormLayout.Group>
                      <TextField
                        label="خط العرض (Latitude)"
                        value={latitude}
                        onChange={setLatitude}
                        type="number"
                        autoComplete="off"
                        helpText="خط العرض للموقع على الخريطة"
                      />

                      <TextField
                        label="خط الطول (Longitude)"
                        value={longitude}
                        onChange={setLongitude}
                        type="number"
                        autoComplete="off"
                        helpText="خط الطول للموقع على الخريطة"
                      />
                    </FormLayout.Group>

                    <TextField
                      label="معرف الجهاز"
                      value={deviceId}
                      onChange={setDeviceId}
                      autoComplete="off"
                      error={actionData?.errors?.deviceId}
                      helpText="معرف فريد للجهاز الذي سيستقبل الطلبات لهذا الفرع"
                      requiredIndicator
                    />

                    <Button
                      onClick={() => setIsActive(!isActive)}
                      pressed={isActive}
                    >
                      {isActive ? "الفرع نشط" : "الفرع غير نشط"}
                    </Button>

                    <Button primary submit>حفظ التغييرات</Button>
                  </FormLayout>
                </Form>
              </Card>
            </Layout.Section>

            <Layout.Section secondary>
              <Card title="معلومات الفرع">
                <Card.Section>
                  <Stack vertical spacing="tight">
                    <Text variant="bodyMd" as="p">
                    المعرف: {branch.id}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      تاريخ الإنشاء: {new Date(branch.createdAt).toLocaleDateString()}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      آخر تحديث: {new Date(branch.updatedAt).toLocaleDateString()}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      عدد العناصر في القائمة: {branch.menuItemsCount}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      عدد الطلبات: {branch.ordersCount}
                    </Text>
                  </Stack>
                </Card.Section>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        {selectedTab === 1 && (
          <Card title="قائمة الطعام">
            <Card.Section>
              <Stack distribution="trailing">
                <Button variant="primary" url={`/app/branches/${branch.id}/add-menu-item`}>
                  إضافة عنصر جديد
                </Button>
              </Stack>
            </Card.Section>
            <Card.Section>
              {menuItemRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["الاسم", "الفئة", "السعر", "الحالة", "الإجراءات"]}
                  rows={menuItemRows}
                />
              ) : (
                <EmptyState
                  heading="لا توجد عناصر في القائمة"
                  image=""
                >
                  <p>لم يتم إضافة أي عناصر إلى قائمة الطعام في هذا الفرع بعد.</p>
                </EmptyState>
              )}
            </Card.Section>
          </Card>
        )}

        {selectedTab === 2 && (
          <Card title="الطلبات الأخيرة">
            <Card.Section>
              <Stack distribution="trailing">
                <Button url={`/app/orders?branchId=${branch.id}`}>
                  عرض جميع الطلبات
                </Button>
              </Stack>
            </Card.Section>
            <Card.Section>
              {recentOrderRows.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                  headings={["رقم الطلب", "التاريخ", "العميل", "الحالة", "المبلغ", "الإجراءات"]}
                  rows={recentOrderRows}
                />
              ) : (
                <EmptyState
                  heading="لا توجد طلبات"
                  image=""
                >
                  <p>لم يتم استلام أي طلبات لهذا الفرع بعد.</p>
                </EmptyState>
              )}
            </Card.Section>
          </Card>
        )}

        {selectedTab === 3 && (
          <Card title="إحصائيات الفرع">
            <Card.Section>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                  <LegacyCard title="إجمالي الإيرادات">
                    <LegacyCard.Section>
                      <Text variant="headingLg" as="h3">
                        ${stats.totalRevenue.toFixed(2)}
                      </Text>
                    </LegacyCard.Section>
                  </LegacyCard>
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                  <LegacyCard title="إجمالي الطلبات">
                    <LegacyCard.Section>
                      <Text variant="headingLg" as="h3">
                        {branch.ordersCount}
                      </Text>
                    </LegacyCard.Section>
                  </LegacyCard>
                </Grid.Cell>

                <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                  <LegacyCard title="إجمالي العناصر">
                    <LegacyCard.Section>
                      <Text variant="headingLg" as="h3">
                        {branch.menuItemsCount}
                      </Text>
                    </LegacyCard.Section>
                  </LegacyCard>
                </Grid.Cell>
              </Grid>
            </Card.Section>

            <Card.Section title="حالة الطلبات">
              <DataTable
                columnContentTypes={["text", "numeric"]}
                headings={["الحالة", "العدد"]}
                rows={stats.orderStats.map(stat => [
                  orderStatusMap[stat.status]?.content || stat.status,
                  stat._count
                ])}
              />
            </Card.Section>

            <Card.Section title="فئات القائمة">
              <DataTable
                columnContentTypes={["text", "numeric"]}
                headings={["الفئة", "عدد العناصر"]}
                rows={stats.menuCategories.map(cat => [
                  cat.category || "عام",
                  cat._count
                ])}
              />
            </Card.Section>
          </Card>
        )}
      </Tabs>
    </Page>
  );
}
