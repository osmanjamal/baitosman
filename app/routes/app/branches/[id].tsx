import { useEffect, useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  Grid,
  LegacyStack,
  Toast
} from "@shopify/polaris";
import { getBranchById, updateBranch } from "~/models/branch.server";
import { requireAuth } from "~/shopify.server";

export async function loader({ request, params }) {
  await requireAuth(request);

  const { id } = params;

  if (!id) {
    return redirect("/app/branches");
  }

  const branch = await getBranchById(id);

  if (!branch) {
    return redirect("/app/branches");
  }

  return json({ branch });
}

export async function action({ request, params }) {
  await requireAuth(request);

  const { id } = params;
  const formData = await request.formData();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const address = formData.get("address") as string;
  const deviceId = formData.get("deviceId") as string;

  if (!name || !deviceId) {
    return json(
      { errors: { name: !name ? "Name is required" : null, deviceId: !deviceId ? "Device ID is required" : null } },
      { status: 400 }
    );
  }

  try {
    const branch = await updateBranch(id, { name, description, address, deviceId });
    return json({ branch, success: true });
  } catch (error) {
    return json({ errors: { form: "Failed to update branch" } }, { status: 500 });
  }
}

export default function BranchDetail() {
  const { branch } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [name, setName] = useState(branch.name);
  const [description, setDescription] = useState(branch.description || "");
  const [address, setAddress] = useState(branch.address || "");
  const [deviceId, setDeviceId] = useState(branch.deviceId);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
    }
  }, [actionData]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("address", address);
    formData.append("deviceId", deviceId);

    submit(formData, { method: "post" });
  };

  return (
    <Page
      title={`Edit Branch: ${branch.name}`}
      backAction={{ content: "Branches", url: "/app/branches" }}
    >
      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      {showToast && (
        <Toast
          content="Branch updated successfully"
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post" onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  label="Branch Name"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  error={actionData?.errors?.name}
                  requiredIndicator
                />

                <TextField
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  multiline={3}
                  autoComplete="off"
                />

                <TextField
                  label="Address"
                  value={address}
                  onChange={setAddress}
                  autoComplete="off"
                />

                <TextField
                  label="Device ID"
                  value={deviceId}
                  onChange={setDeviceId}
                  autoComplete="off"
                  error={actionData?.errors?.deviceId}
                  helpText="Unique identifier for the device that will receive orders for this branch"
                  requiredIndicator
                />

                <Button primary submit>Save Branch</Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card title="Branch Information">
            <Card.Section>
              <LegacyStack vertical spacing="tight">
                <Text variant="bodyMd" as="p">
                  ID: {branch.id}
                </Text>
                <Text variant="bodyMd" as="p">
                  Created: {new Date(branch.createdAt).toLocaleDateString()}
                </Text>
                <Text variant="bodyMd" as="p">
                  Last Updated: {new Date(branch.updatedAt).toLocaleDateString()}
                </Text>
              </LegacyStack>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
