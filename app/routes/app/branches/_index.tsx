import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Page, Card, Button, DataTable, Text } from "@shopify/polaris";
import { getAllBranches } from "~/models/branch.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request }) {
  await requireAuth(request);

  const branches = await getAllBranches();
  return json({ branches });
}

export default function BranchesIndex() {
  const { branches } = useLoaderData();

  const rows = branches.map(branch => [
    branch.name,
    branch.address || "-",
    branch.deviceId,
    <Link to={`/app/branches/${branch.id}`}>View / Edit</Link>
  ]);

  return (
    <Page
      title="Branch Management"
      primaryAction={
        <Button primary url="/app/branches/new">
          Add Branch
        </Button>
      }
    >
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Name", "Address", "Device ID", "Actions"]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}
