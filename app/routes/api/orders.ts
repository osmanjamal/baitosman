import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { getOrdersByBranchId, createOrder, updateOrderStatus } from "~/models/order.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");

  if (!branchId) {
    return json({ error: "Branch ID is required" }, { status: 400 });
  }

  const orders = await getOrdersByBranchId(branchId);
  return json({ orders });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);

  if (request.method === "POST") {
    const { orderData, orderItems } = await request.json();
    const order = await createOrder(orderData, orderItems);
    return json({ order });
  }

  if (request.method === "PUT") {
    const { id, status } = await request.json();
    const order = await updateOrderStatus(id, status);
    return json({ order });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
