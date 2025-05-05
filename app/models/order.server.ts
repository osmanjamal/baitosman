import { prisma } from "~/db.server";
import type { Order, OrderItem } from "@prisma/client";

export type OrderWithItems = Order & {
  orderItems: (OrderItem & {
    menuItem: { name: string; price: number };
  })[];
};

export async function createOrder(
  data: Pick<Order, "branchId" | "customerName" | "customerPhone" | "totalAmount">,
  orderItems: Array<Pick<OrderItem, "menuItemId" | "quantity" | "price" | "note">>
) {
  // Generate a unique order number
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  return prisma.order.create({
    data: {
      ...data,
      orderNumber,
      orderItems: {
        create: orderItems
      }
    },
    include: {
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
    }
  });
}

export async function getOrdersByBranchId(branchId: string) {
  return prisma.order.findMany({
    where: { branchId },
    include: {
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
    orderBy: { createdAt: "desc" }
  });
}

export async function updateOrderStatus(id: string, status: Order["status"]) {
  return prisma.order.update({
    where: { id },
    data: { status }
  });
}
