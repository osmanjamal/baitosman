import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";



// app/routes/api/menu.ts - تحديث للسماح بالتصفية والبحث
export async function loader({ request }) {
  await requireAuth(request);

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const includeUnavailable = url.searchParams.get("includeUnavailable") === "true";

  if (!branchId) {
    return json({ error: "Branch ID is required" }, { status: 400 });
  }

  // التحقق من وجود الفرع
  const branch = await prisma.branch.findUnique({
    where: { id: branchId }
  });

  if (!branch) {
    return json({ error: "Branch not found" }, { status: 404 });
  }

  // بناء استعلام البحث والتصفية
  let whereClause = {
    branchId
  };

  if (!includeUnavailable) {
    whereClause.isAvailable = true;
  }

  if (category) {
    whereClause.category = category;
  }

  if (search) {
    whereClause = {
      ...whereClause,
      OR: [
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    };
  }

  // الحصول على عناصر القائمة المصفاة
  const menuItems = await prisma.menuItem.findMany({
    where: whereClause,
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  // تنظيم العناصر حسب الفئة
  const categorizedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'عام';

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(item);
    return acc;
  }, {});

  // الحصول على جميع الفئات المتاحة
  const allCategories = await prisma.menuItem.groupBy({
    by: ['category'],
    where: { branchId },
    _count: true
  });

  return json({
    menu: categorizedMenu,
    categories: allCategories.map(cat => ({
      name: cat.category || 'عام',
      count: cat._count
    }))
  });
}



export async function action({ request }: ActionFunctionArgs) {
  try {
    await requireAuth(request);

    // إدارة طلبات POST (إضافة عنصر جديد للقائمة)
    if (request.method === "POST") {
      const data = await request.json();

      // التحقق من البيانات المطلوبة
      if (!data.name || !data.price || !data.branchId) {
        return json({
          error: "Missing required fields",
          details: {
            name: !data.name ? "Item name is required" : null,
            price: !data.price ? "Price is required" : null,
            branchId: !data.branchId ? "Branch ID is required" : null
          }
        }, { status: 400 });
      }

      // التحقق من وجود الفرع
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId }
      });

      if (!branch) {
        return json({ error: "Branch not found" }, { status: 404 });
      }

      // إنشاء عنصر القائمة
      const menuItem = await prisma.menuItem.create({
        data: {
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price),
          imageUrl: data.imageUrl || null,
          category: data.category || 'عام',
          isAvailable: data.isAvailable !== false,
          branchId: data.branchId
        }
      });

      return json({
        success: true,
        menuItem,
        message: "Menu item added successfully"
      }, { status: 201 });
    }

    // إدارة طلبات PUT (تحديث عنصر قائمة)
    if (request.method === "PUT") {
      const data = await request.json();
      const { id, ...updateData } = data;

      if (!id) {
        return json({ error: "Item ID is required" }, { status: 400 });
      }

      // التحقق من وجود العنصر
      const existingItem = await prisma.menuItem.findUnique({
        where: { id }
      });

      if (!existingItem) {
        return json({ error: "Menu item not found" }, { status: 404 });
      }

      // تحديث العنصر
      const menuItem = await prisma.menuItem.update({
        where: { id },
        data: {
          name: updateData.name,
          description: updateData.description,
          price: updateData.price !== undefined ? parseFloat(updateData.price) : undefined,
          imageUrl: updateData.imageUrl,
          category: updateData.category,
          isAvailable: updateData.isAvailable
        }
      });

      return json({
        success: true,
        menuItem,
        message: "Menu item updated successfully"
      });
    }

    // إدارة طلبات DELETE (حذف عنصر قائمة)
    if (request.method === "DELETE") {
      const data = await request.json();
      const { id } = data;

      if (!id) {
        return json({ error: "Item ID is required" }, { status: 400 });
      }

      // حذف العنصر
      await prisma.menuItem.delete({
        where: { id }
      });

      return json({
        success: true,
        message: "Menu item deleted successfully"
      });
    }

    // إدارة طلبات PATCH (تغيير حالة توفر العنصر)
    if (request.method === "PATCH") {
      const data = await request.json();
      const { id, isAvailable } = data;

      if (!id || isAvailable === undefined) {
        return json({
          error: "Missing required fields",
          details: {
            id: !id ? "Item ID is required" : null,
            isAvailable: isAvailable === undefined ? "Availability status is required" : null
          }
        }, { status: 400 });
      }

      // تحديث حالة توفر العنصر
      const menuItem = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable }
      });

      return json({
        success: true,
        menuItem,
        message: `Menu item ${isAvailable ? 'activated' : 'deactivated'} successfully`
      });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Error in menu API action:", error);
    return json({
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
