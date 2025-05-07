import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireAuth } from "../../shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    await requireAuth(request);

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const includeMenu = url.searchParams.get("includeMenu") === "true";
    const activeOnly = url.searchParams.get("activeOnly") !== "false"; // افتراضيًا جلب الفروع النشطة فقط

    // إذا طلب فرع محدد بواسطة المعرف
    if (id) {
      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          menuItems: includeMenu ? {
            where: { isAvailable: true },
            orderBy: { category: 'asc' }
          } : false
        }
      });

      if (!branch) {
        return json({ error: "Branch not found" }, { status: 404 });
      }

      return json({ branch });
    }

    // جلب جميع الفروع
    const branchesQuery = {
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
      include: {
        menuItems: includeMenu ? {
          where: { isAvailable: true },
          orderBy: { category: 'asc' }
        } : false,
        _count: {
          select: { orders: true, menuItems: true }
        }
      }
    };

    const branches = await prisma.branch.findMany(branchesQuery);

    return json({
      branches: branches.map((branch: { _count: { orders: number; menuItems: number }; [key: string]: any }) => ({
        ...branch,
        ordersCount: branch._count.orders,
        menuItemsCount: branch._count.menuItems,
        _count: undefined // إزالة البيانات الداخلية
      }))
    });
  } catch (error) {
    console.error("Error in branches API:", error);
    return json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

// app/routes/api/branches.ts - تحديث للسماح بالتصفية والبحث
export async function loader({ request }) {
  await requireAuth(request);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const activeOnly = url.searchParams.get("activeOnly") !== "false"; // افتراضيًا، عودة الفروع النشطة فقط
  const search = url.searchParams.get("search");

  if (id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            menuItems: true
          }
        }
      }
    });

    if (!branch) {
      return json({ error: "Branch not found" }, { status: 404 });
    }

    return json({ branch });
  }

  // بناء استعلام البحث والتصفية
  let whereClause = {};

  if (activeOnly) {
    whereClause = { ...whereClause, isActive: true };
  }

  if (search) {
    whereClause = {
      ...whereClause,
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
        { address: { contains: search } }
      ]
    };
  }

  const branches = await prisma.branch.findMany({
    where: whereClause,
    include: {
      _count: {
        select: {
          orders: true,
          menuItems: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return json({ branches });
}


export async function action({ request }: ActionFunctionArgs) {
  try {
    await requireAuth(request);

    // إدارة طلبات POST (إنشاء فرع جديد)
    if (request.method === "POST") {
      const data = await request.json();

      // التحقق من البيانات المطلوبة
      if (!data.name || !data.deviceId) {
        return json({
          error: "Missing required fields",
          details: {
            name: !data.name ? "Branch name is required" : null,
            deviceId: !data.deviceId ? "Device ID is required" : null
          }
        }, { status: 400 });
      }

      // التحقق من عدم وجود فرع بنفس deviceId
      const existingBranch = await prisma.branch.findUnique({
        where: { deviceId: data.deviceId }
      });

      if (existingBranch) {
        return json({
          error: "Device ID already registered to another branch"
        }, { status: 409 });
      }

      // إنشاء الفرع الجديد
      const branch = await prisma.branch.create({
        data: {
          name: data.name,
          description: data.description || null,
          address: data.address || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          deviceId: data.deviceId,
          isActive: data.isActive !== false
        }
      });

      return json({
        success: true,
        branch,
        message: "Branch created successfully"
      }, { status: 201 });
    }

    // إدارة طلبات PUT (تحديث فرع موجود)
    if (request.method === "PUT") {
      const data = await request.json();
      const { id, ...updateData } = data;

      if (!id) {
        return json({ error: "Branch ID is required" }, { status: 400 });
      }

      // التحقق من وجود الفرع
      const existingBranch = await prisma.branch.findUnique({
        where: { id }
      });

      if (!existingBranch) {
        return json({ error: "Branch not found" }, { status: 404 });
      }

      // التحقق من أن deviceId غير مستخدم بالفعل من قبل فرع آخر
      if (updateData.deviceId && updateData.deviceId !== existingBranch.deviceId) {
        const deviceExists = await prisma.branch.findFirst({
          where: {
            deviceId: updateData.deviceId,
            id: { not: id }
          }
        });

        if (deviceExists) {
          return json({
            error: "Device ID already registered to another branch"
          }, { status: 409 });
        }
      }

      // تحديث الفرع
      const branch = await prisma.branch.update({
        where: { id },
        data: updateData
      });

      return json({
        success: true,
        branch,
        message: "Branch updated successfully"
      });
    }

    // إدارة طلبات DELETE (حذف فرع)
    if (request.method === "DELETE") {
      const data = await request.json();
      const { id } = data;

      if (!id) {
        return json({ error: "Branch ID is required" }, { status: 400 });
      }

      // بدلاً من الحذف الفعلي، نقوم بتعطيل الفرع
      await prisma.branch.update({
        where: { id },
        data: { isActive: false }
      });

      return json({
        success: true,
        message: "Branch deactivated successfully"
      });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in branches API action:", error);
    return json({
      error: "An unexpected error occurred",
      details: error.message
    }, { status: 500 });
  }
}
