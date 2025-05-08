// app/routes/app.branches._index.tsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  DataTable,
  Badge,
  ButtonGroup,
  EmptyState
} from "@shopify/polaris";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";
import { getAllBranches } from "~/models/branch.server";

type LoaderData = {
  orders: Array<{
    id: string;
    orderNumber: string;
    branch: { name: string };
    customerName: string | null;
    status: string;
    createdAt: string;
    totalAmount: number;
  }>;
  branches: Array<{ id: string; name: string }>;
};

export async function loader({ request }): Promise<LoaderData> {
  await requireAuth(request);

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId") || "";
  const status = url.searchParams.get("status") || "";

  const branches = await getAllBranches();

  let whereClause = {};

  if (branchId) {
    whereClause = { ...whereClause, branchId };
  }

  if (status) {
    whereClause = { ...whereClause, status };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      branch: {
        select: { name: true }
      },
      orderItems: {
        include: {
          menuItem: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ orders, branches });
}

export default function OrdersIndex() {
  const { orders } = useLoaderData<LoaderData>();

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

  const rows = orders.map(order => [
    <span key={`order-${order.id}`}>{order.orderNumber}</span>,
    <span key={`branch-${order.id}`}>{order.branch.name}</span>,
    order.customerName || "-",
    getStatusBadge(order.status),
    new Date(order.createdAt).toLocaleString(),
    `$${order.totalAmount.toFixed(2)}`,
    <ButtonGroup key={`actions-${order.id}`}>
      <Button url={`/app/orders/${order.id}`}>View</Button>
    </ButtonGroup>
  ]);

  return (
    <Page title="Orders">
      <Layout>
        <Layout.Section>
          <Card>
            {orders.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                  "text"
                ]}
                headings={[
                  "Order #",
                  "Branch",
                  "Customer",
                  "Status",
                  "Date",
                  "Total",
                  "Actions"
                ]}
                rows={rows}
              />
            ) : (
              <EmptyState
                heading="No orders found"
                image=""
              >
                <p>No orders match your current filter criteria.</p>
              </EmptyState>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
