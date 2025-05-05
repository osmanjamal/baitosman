import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");

  if (!branchId) {
    return json({ error: "Branch ID is required" }, { status: 400 });
  }

  // Get menu items for the specified branch
  const menuItems = await prisma.menuItem.findMany({
    where: {
      branchId,
      isAvailable: true
    },
    orderBy: {
      category: 'asc'
    }
  });

  // Group items by category
  const categorizedMenu = menuItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  return json({ menu: categorizedMenu });
}

export async function action({ request }: LoaderFunctionArgs) {
  const { admin } = await requireAuth(request);

  if (request.method === "POST") {
    const data = await request.json();

    const menuItem = await prisma.menuItem.create({
      data
    });

    return json({ menuItem });
  }

  if (request.method === "PUT") {
    const data = await request.json();
    const { id, ...updateData } = data;

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: updateData
    });

    return json({ menuItem });
  }

  if (request.method === "DELETE") {
    const data = await request.json();
    const { id } = data;

    await prisma.menuItem.delete({
      where: { id }
    });

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
