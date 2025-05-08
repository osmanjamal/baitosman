// app/components/BranchDashboard.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Tabs,
  ResourceList,
  Badge,
  Button,
  ButtonGroup,
  Banner,
  EmptyState
} from "@shopify/polaris";
import type { Order } from "@prisma/client";

interface BranchDashboardProps {
  branchId: string;
}

export function BranchDashboard({ branchId }: BranchDashboardProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`/api/orders?branchId=${branchId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError("Error loading orders. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (branchId) {
      fetchOrders();

      // Set up polling to refresh orders every 30 seconds
      const interval = setInterval(fetchOrders, 30000);

      return () => clearInterval(interval);
    }
  }, [branchId, fetchOrders]);

  const handleTabChange = useCallback((selectedTabIndex) => {
    setSelectedTab(selectedTabIndex);
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: orderId,
          status
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh orders after status update
      fetchOrders();
    } catch (err) {
      console.error("Error updating order:", err);
      setError("Failed to update order status. Please try again.");
    }
  };

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

  const tabs = [
    {
      id: "pending",
      content: "Pending",
      accessibilityLabel: "Pending orders",
      panelID: "pending-orders",
    },
    {
      id: "preparing",
      content: "Preparing",
      accessibilityLabel: "Orders being prepared",
      panelID: "preparing-orders",
    },
    {
      id: "ready",
      content: "Ready",
      accessibilityLabel: "Orders ready for pickup",
      panelID: "ready-orders",
    },
    {
      id: "completed",
      content: "Completed",
      accessibilityLabel: "Completed orders",
      panelID: "completed-orders",
    }
  ];

  const statusFilters = ["PENDING", "PREPARING", "READY", "COMPLETED"];
  const filteredOrders = orders.filter(order => order.status === statusFilters[selectedTab]);

  const getActionButtons = (order) => {
    switch (order.status) {
      case "PENDING":
        return (
          <Button
            primary
            onClick={() => updateOrderStatus(order.id, "PREPARING")}
          >
            Start Preparing
          </Button>
        );
      case "PREPARING":
        return (
          <Button
            primary
            onClick={() => updateOrderStatus(order.id, "READY")}
          >
            Mark as Ready
          </Button>
        );
      case "READY":
        return (
          <Button
            primary
            onClick={() => updateOrderStatus(order.id, "COMPLETED")}
          >
            Complete Order
          </Button>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <Card><Card.Section>Loading orders...</Card.Section></Card>;
  }

  if (error) {
    return (
      <Banner status="critical" onDismiss={() => setError("")}>
        {error}
      </Banner>
    );
  }

  return (
    <Card>
      <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
        <Card.Section>
        {filteredOrders.length === 0 ? (
            <EmptyState
              heading={`No ${tabs[selectedTab].content.toLowerCase()} orders`}
              image=""
            >
              <p>There are currently no orders with status "{tabs[selectedTab].content}".</p>
            </EmptyState>
          ) : (
            <ResourceList
              resourceName={{ singular: 'order', plural: 'orders' }}
              items={filteredOrders}
              renderItem={(order) => {
                const { id, orderNumber, customerName, createdAt, totalAmount, orderItems } = order;

                return (
                  <ResourceList.Item
                    id={id}
                    accessibilityLabel={`View details for order ${orderNumber}`}
                  >
                    <div className="resource-item">
                      <div className="order-info">
                        <h3>Order #{orderNumber}</h3>
                        <p>Customer: {customerName || "Anonymous"}</p>
                        <p>Time: {new Date(createdAt).toLocaleString()}</p>
                        <p>Total: ${totalAmount.toFixed(2)}</p>
                        <div className="order-status">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      <div className="order-items">
                        <h4>Items:</h4>
                        <ul>
                          {orderItems.map(item => (
                            <li key={item.id}>
                              {item.quantity} x {item.menuItem.name}
                              {item.note && <span className="item-note"> - Note: {item.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="order-actions">
                        <ButtonGroup>
                          {getActionButtons(order)}
                          <Button url={`/app/orders/${id}`}>View Details</Button>
                        </ButtonGroup>
                      </div>
                    </div>
                  </ResourceList.Item>
                );
              }}
            />
          )}
        </Card.Section>
      </Tabs>

      <style jsx>{`
        .resource-item {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .order-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .order-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .order-info p {
          margin: 0;
        }

        .order-status {
          margin-top: 5px;
        }

        .order-items {
          padding: 0 10px;
        }

        .order-items h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .order-items ul {
          margin: 0;
          padding-left: 20px;
        }

        .item-note {
          font-style: italic;
          color: #666;
        }

        .order-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        @media (max-width: 768px) {
          .resource-item {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .order-actions {
            justify-content: flex-start;
            margin-top: 10px;
          }
        }
      `}</style>
    </Card>
  );
}
