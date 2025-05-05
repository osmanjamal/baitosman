import { json } from "@remix-run/node";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { getAllBranches, getBranchById, createBranch, updateBranch } from "~/models/branch.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAuth(request);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const branch = await getBranchById(id);
    if (!branch) {
      return json({ error: "Branch not found" }, { status: 404 });
    }
    return json({ branch });
  }

  const branches = await getAllBranches();
  return json({ branches });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAuth(request);

  const { admin } = await requireAuth(request);

  if (request.method === "POST") {
    const data = await request.json();
    const branch = await createBranch(data);
    return json({ branch });
  }

  if (request.method === "PUT") {
    const data = await request.json();
    const { id, ...updateData } = data;
    const branch = await updateBranch(id, updateData);
    return json({ branch });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
