import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireAuth(request);

    const url = new URL(request.url);
    const branchId = url.searchParams.get("branchId");
    const status = url.searchParams.get("status");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const orderNumber = url.searchParams.get("orderNumber");
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit") as string) : undefined;

    // فلترة متقدمة
    let whereClause: any = {};

    if (branchId) {
      whereClause.branchId = branchId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (orderNumber) {
      whereClause.orderNumber = orderNumber;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    } else if (startDate) {
      whereClause.createdAt = {
        gte: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.createdAt = {
        lte: new Date(endDate)
      };
    }

    // جلب الطلبات
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                price: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // إحصائيات إضافية
    const totalCount = await prisma.order.count({ where: whereClause });
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    });

    let totalAmount = 0;
    orders.forEach(order => {
      totalAmount += order.totalAmount;
    });

    return json({
      orders,
      meta: {
        total: totalCount,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        totalAmount
      }
    });
  } catch (error) {
    console.error("Error in orders API:", error);
    return json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    await requireAuth(request);

    // إدارة طلبات POST (إنشاء طلب جديد)
    if (request.method === "POST") {
      const { orderData, orderItems } = await request.json();

      // التحقق من البيانات المطلوبة
      if (!orderData.branchId || !orderData.totalAmount || !orderItems || !orderItems.length) {
        return json({
          error: "Missing required fields",
          details: {
            branchId: !orderData.branchId ? "Branch ID is required" : null,
            totalAmount: !orderData.totalAmount ? "Total amount is required" : null,
            orderItems: !orderItems || !orderItems.length ? "Order items are required" : null
          }
        }, { status: 400 });
      }

      // التحقق من وجود الفرع
      const branch = await prisma.branch.findUnique({
        where: { id: orderData.branchId }
      });

      if (!branch) {
        return json({ error: "Branch not found" }, { status: 404 });
      }

      // إنشاء رقم طلب فريد - تحسين طريقة التوليد
      const lastOrder = await prisma.order.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      const lastOrderNumber = lastOrder?.orderNumber || 'ORD-000000';
      const lastNumber = parseInt(lastOrderNumber.split('-')[1]);
      const newOrderNumber = `ORD-${String(lastNumber + 1).padStart(6, '0')}`;

      // إنشاء الطلب والعناصر في معاملة واحدة
      const order = await prisma.$transaction(async (tx) => {
        // إنشاء الطلب
        const newOrder = await tx.order.create({
          data: {
            orderNumber: newOrderNumber,
            branchId: orderData.branchId,
            customerName: orderData.customerName || null,
            customerPhone: orderData.customerPhone || null,
            customerEmail: orderData.customerEmail || null,
            totalAmount: parseFloat(orderData.totalAmount),
            paymentMethod: orderData.paymentMethod || null,
            deliveryMethod: orderData.deliveryMethod || null,
            deliveryAddress: orderData.deliveryAddress || null,
            notes: orderData.notes || null,
            orderItems: {
              create: orderItems.map(item => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: parseFloat(item.price),
                note: item.note || null
              }))
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
            },
            branch: {
              select: {
                name: true
              }
            }
          }
        });

        return newOrder;
      });

      // ارسال إشعار بنجاح إنشاء الطلب (يمكن إضافة إرسال بريد إلكتروني أو إشعار آخر هنا)

      return json({
        success: true,
        order,
        message: "Order created successfully"
      }, { status: 201 });
    }

    // إدارة طلبات PUT (تحديث حالة الطلب)
    if (request.method === "PUT") {
      const { id, status } = await request.json();

      if (!id || !status) {
        return json({
          error: "Missing required fields",
          details: {
            id: !id ? "Order ID is required" : null,
            status: !status ? "Status is required" : null
          }
        }, { status: 400 });
      }

      // التحقق من وجود الطلب
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        return json({ error: "Order not found" }, { status: 404 });
      }

      // التحقق من أن الحالة الجديدة صالحة
      const validStatuses = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
      if (!validStatuses.includes(status)) {
        return json({ error: "Invalid status value" }, { status: 400 });
      }

      // تحديث حالة الطلب
      const order = await prisma.order.update({
        where: { id },
        data: { status },
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
          },
          branch: {
            select: {
              name: true
            }
          }
        }
      });

      return json({
        success: true,
        order,
        message: `Order status updated to ${status} successfully`
      });
    }

    // إدارة طلبات PATCH (تحديث بيانات الطلب)
    if (request.method === "PATCH") {
      const data = await request.json();
      const { id, ...updateData } = data;

      if (!id) {
        return json({ error: "Order ID is required" }, { status: 400 });
      }

      // التحقق من وجود الطلب
      const existingOrder = await prisma.order.findUnique({
        where: { id }
      });

      if (!existingOrder) {
        return json({ error: "Order not found" }, { status: 404 });
      }

      // تحديث بيانات الطلب
      const order = await prisma.order.update({
        where: { id },
        data: updateData,
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

      return json({
        success: true,
        order,
        message: "Order updated successfully"
      });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in orders API action:", error);
    return json({
      error: "An unexpected error occurred",
      details: error.message
    }, { status: 500 });
  }
}
