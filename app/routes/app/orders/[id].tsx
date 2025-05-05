import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Banner,
  LegacyStack,
  Text,
  Button,
  ButtonGroup,
  DataTable,
  Select,
  Badge,
  Divider
} from "@shopify/polaris";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";
import { updateOrderStatus } from "~/models/order.server";

export async function loader({ request, params }) {
  await requireAuth(request);

  const { id } = params;

  if (!id) {
    return redirect("/app/orders");
  }

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
  await requireAuth(request);

  const { id } = params;
  const formData = await request.formData();

  const status = formData.get("status") as any;

  try {
    const order = await updateOrderStatus(id, status);
    return json({ success: true, order });
  } catch (error) {
    return json({ errors: { form: "Failed to update order status" } }, { status: 500 });
  }
}

export default function OrderDetail() {
  const { order } = useLoaderData();
  const actionData = useActionData();

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { content: "Pending", status: "warning" },
      PREPARING: { content: "Preparing", status: "info" },
      READY: { content: "Ready", status: "success" },
      COMPLETED: { content: "Completed", status: "success" },
      CANCELLED: { content: "Cancelled", status: "critical" }
    };

    const badgeInfo = statusMap[status] || { content: status, status: "default" };

    return <Badge status={badgeInfo.status}>{badgeInfo.content}</Badge>;
  };

  const statusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Preparing", value: "PREPARING" },
    { label: "Ready", value: "READY" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" }
  ];

  const orderItemRows = order.orderItems.map(item => [
    item.menuItem.name,
    item.quantity,
    `$${item.price.toFixed(2)}`,
    `$${(item.price * item.quantity).toFixed(2)}`,
    item.note || "-"
  ]);

  return (
    <Page
      title={`Order #${order.orderNumber}`}
      backAction={{ content: "Orders", url: "/app/orders" }}
    >
      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      {actionData?.success && (
        <Banner status="success" onDismiss={() => {}}>
          <p>Order status updated successfully.</p>
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card title="Order Details">
            <Card.Section>
              <LegacyStack distribution="equalSpacing">
                <LegacyStack.Item>
                  <Text variant="bodyMd" as="p">
                    <strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}
                  </Text>
                </LegacyStack.Item>
                <LegacyStack.Item>
                  <Text variant="bodyMd" as="p">
                    <strong>Status:</strong> {getStatusBadge(order.status)}
                  </Text>
                </LegacyStack.Item>
              </LegacyStack>
            </Card.Section>

            <Card.Section>
              <LegacyStack vertical spacing="tight">
                <Text variant="bodyMd" as="p">
                  <strong>Branch:</strong> {order.branch.name}
                </Text>
                <Text variant="bodyMd" as="p">
                  <strong>Customer:</strong> {order.customerName || "-"}
                </Text>
                <Text variant="bodyMd" as="p">
                  <strong>Phone:</strong> {order.customerPhone || "-"}
                </Text>
              </LegacyStack>
            </Card.Section>

            <Card.Section title="Items">
              <DataTable
                columnContentTypes={[
                  "text",
                  "numeric",
                  "numeric",
                  "numeric",
                  "text"
                ]}
                headings={[
                  "Item",
                  "Quantity",
                  "Price",
                  "Total",
                  "Notes"
                ]}
                rows={orderItemRows}
                totals={["", "", "", `$${order.totalAmount.toFixed(2)}`, ""]}
              />
            </Card.Section>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card title="Update Status">
            <Card.Section>
              <Form method="post">
                <LegacyStack vertical spacing="tight">
                  <Select
                    label="Order Status"
                    options={statusOptions}
                    name="status"
                    value={order.status}
                  />
                  <Button primary submit>Update Status</Button>
                </LegacyStack>
              </Form>
            </Card.Section>
          </Card>

          <div style={{ marginTop: "1rem" }}>
            <Card title="Actions">
              <Card.Section>
                <ButtonGroup fullWidth>
                  <Button
                    variant="primary"
                    url={`/app/orders/${order.id}/print`}
                  >
                    Print Order
                  </Button>

                  <Button
                    variant="primary"
                    url={`mailto:${order.customerEmail || ''}`}
                    disabled={!order.customerEmail}
                  >
                    Contact Customer
                  </Button>
                </ButtonGroup>
              </Card.Section>
            </Card>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
