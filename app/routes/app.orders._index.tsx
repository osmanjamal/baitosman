// app/routes/app.orders._index.tsx
import { useState, useCallback } from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Filters,
  DataTable,
  Badge,
  Button,
  Select,
  ButtonGroup,
  EmptyState
} from "@shopify/polaris";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";
import { getAllBranches } from "~/models/branch.server";

export async function loader({ request }) {
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
              name: true,
              price: true
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
  const { orders, branches } = useLoaderData();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const handleBranchChange = useCallback((value) => {
    setSelectedBranchId(value);
  }, []);

  const handleStatusChange = useCallback((value) => {
    setSelectedStatus(value);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedBranchId("");
    setSelectedStatus("");
  }, []);

  const branchOptions = [
    { label: "All Branches", value: "" },
    ...branches.map(branch => ({
      label: branch.name,
      value: branch.id
    }))
  ];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Pending", value: "PENDING" },
    { label: "Preparing", value: "PREPARING" },
    { label: "Ready", value: "READY" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" }
  ];

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
    order.orderNumber,
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
            <Filters
              queryValue=""
              filters={[
                {
                  key: "branch",
                  label: "Branch",
                  filter: (
                    <Select
                      label="Branch"
                      options={branchOptions}
                      value={selectedBranchId}
                      onChange={handleBranchChange}
                      labelHidden
                    />
                  ),
                  shortcut: true,
                },
                {
                  key: "status",
                  label: "Status",
                  filter: (
                    <Select
                      label="Status"
                      options={statusOptions}
                      value={selectedStatus}
                      onChange={handleStatusChange}
                      labelHidden
                    />
                  ),
                  shortcut: true,
                },
              ]}
              onQueryChange={() => {}}
              onQueryClear={() => {}}
              onClearAll={handleClearFilters}
            />

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
