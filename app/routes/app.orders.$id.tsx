// app/routes/app.orders.$id.tsx
import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Badge,
  Button,
  Select,
  Banner

} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export async function loader({ request, params }) {
  await authenticate.admin(request);

  const { id } = params;

  if (!id) {
    return redirect("/app/orders");
  }

  // جلب تفاصيل الطلب
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      branch: true,
      orderItems: {
        include: {
          menuItem: true
        }
      }
    }
  });

  if (!order) {
    return redirect("/app/orders");
  }

  return json({ order });
}

export async function action({ request, params }) {
  await authenticate.admin(request);

  const { id } = params;
  const formData = await request.formData();
  const status = formData.get("status");

  // التحقق من صحة الحالة
  const validStatuses = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return json({
      errors: {
        status: "حالة غير صالحة"
      }
    }, { status: 400 });
  }

  try {
    // تحديث حالة الطلب
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status }
    });

    return json({
      success: true,
      message: "تم تحديث حالة الطلب بنجاح",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return json({
      errors: {
        form: "حدث خطأ أثناء تحديث حالة الطلب"
      }
    }, { status: 500 });
  }
}

export default function OrderDetails() {
  const { order } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [status, setStatus] = useState(order.status);

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

  // تحضير خيارات حالة الطلب
  const statusOptions = [
    { label: "معلق", value: "PENDING" },
    { label: "قيد التحضير", value: "PREPARING" },
    { label: "جاهز", value: "READY" },
    { label: "مكتمل", value: "COMPLETED" },
    { label: "ملغي", value: "CANCELLED" }
  ];

  // تحضير صفوف جدول عناصر الطلب
  const orderItemRows = order.orderItems.map(item => [
    item.menuItem.name,
    item.menuItem.category || "عام",
    item.quantity,
    `${item.price.toFixed(2)} ريال`,
    `${(item.quantity * item.price).toFixed(2)} ريال`,
    item.note || "-"
  ]);

  // مجموع قيم العناصر
  const totals = ["", "", "", "", `${order.totalAmount.toFixed(2)} ريال`, ""];

  // معالجة تحديث حالة الطلب
  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("status", status);

    submit(formData, { method: "post" });
  };

  return (
    <Page
      title={`تفاصيل الطلب #${order.orderNumber}`}
      backAction={{ content: "الطلبات", url: "/app/orders" }}
    >
      <TitleBar title={`تفاصيل الطلب #${order.orderNumber}`} />

      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      {actionData?.success && (
        <Banner status="success" onDismiss={() => {}}>
          <p>{actionData.message}</p>
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card title="معلومات الطلب">
            <Card.Section>
              <Stack distribution="equalSpacing">
                <Stack.Item>
                  <TextContainer>
                    <Text variant="headingMd">رقم الطلب: {order.orderNumber}</Text>
                    <Text>التاريخ: {new Date(order.createdAt).toLocaleString('ar-SA')}</Text>
                    <Text>الفرع: {order.branch.name}</Text>
                  </TextContainer>
                </Stack.Item>
                <Stack.Item>
                  <TextContainer>
                    <Text>الحالة: {getStatusBadge(order.status)}</Text>
                    <Text>الإجمالي: {order.totalAmount.toFixed(2)} ريال</Text>
                  </TextContainer>
                </Stack.Item>
              </Stack>
            </Card.Section>

            <Card.Section title="معلومات العميل">
              <TextContainer>
              <Text>الاسم: {order.customerName || "غير محدد"}</Text>
                <Text>رقم الهاتف: {order.customerPhone || "غير محدد"}</Text>
              </TextContainer>
            </Card.Section>

            <Card.Section title="عناصر الطلب">
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric", "text"]}
                headings={["العنصر", "الفئة", "الكمية", "السعر", "الإجمالي", "ملاحظات"]}
                rows={orderItemRows}
                totals={totals}
              />
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card title="تحديث حالة الطلب">
            <Card.Section>
              <Form method="post" onSubmit={handleSubmit}>
                <Stack vertical>
                  <Select
                    label="حالة الطلب"
                    options={statusOptions}
                    value={status}
                    onChange={setStatus}
                    error={actionData?.errors?.status}
                  />
                  <Button primary submit>تحديث الحالة</Button>
                </Stack>
              </Form>
            </Card.Section>
          </Card>

          <div style={{ marginTop: '1rem' }}>
            <Card title="إجراءات سريعة">
              <Card.Section>
                <ButtonGroup fullWidth>
                  <Button
                    onClick={() => window.print()}
                  >
                    طباعة الطلب
                  </Button>

                  {order.customerPhone && (
                    <Button
                      url={`tel:${order.customerPhone}`}
                    >
                      اتصال بالعميل
                    </Button>
                  )}
                </ButtonGroup>
              </Card.Section>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
