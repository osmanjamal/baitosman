// app/routes/app.branches.new.tsx
import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, useSubmit, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "~/shopify.server";
import { prisma } from "~/db.server";

export async function action({ request }) {
  await authenticate.admin(request);

  const formData = await request.formData();
  const name = formData.get("name");
  const description = formData.get("description");
  const address = formData.get("address");
  const deviceId = formData.get("deviceId");

  if (!name || !deviceId) {
    return json(
      { errors: { name: !name ? "اسم الفرع مطلوب" : null, deviceId: !deviceId ? "معرف الجهاز مطلوب" : null } },
      { status: 400 }
    );
  }

  // التحقق من عدم وجود فرع بنفس معرف الجهاز
  const existingBranch = await prisma.branch.findUnique({
    where: { deviceId }
  });

  if (existingBranch) {
    return json(
      { errors: { deviceId: "معرف الجهاز مستخدم بالفعل" } },
      { status: 400 }
    );
  }

  try {
    await prisma.branch.create({
      data: {
        name,
        description: description || null,
        address: address || null,
        deviceId
      }
    });

    return redirect("/app/branches");
  } catch (error) {
    return json(
      { errors: { form: "حدث خطأ أثناء إنشاء الفرع" } },
      { status: 500 }
    );
  }
}

export default function NewBranch() {
  const actionData = useActionData();
  const submit = useSubmit();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [deviceId, setDeviceId] = useState("");

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
      title="إضافة فرع جديد"
      backAction={{ content: "الفروع", url: "/app/branches" }}
    >
      <TitleBar title="إضافة فرع جديد" />

      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post" onSubmit={handleSubmit}>
              <FormLayout>
                <TextField
                  label="اسم الفرع"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                  error={actionData?.errors?.name}
                  requiredIndicator
                />

                <TextField
                  label="الوصف"
                  value={description}
                  onChange={setDescription}
                  multiline={3}
                  autoComplete="off"
                />

                <TextField
                  label="العنوان"
                  value={address}
                  onChange={setAddress}
                  autoComplete="off"
                />

                <TextField
                  label="معرف الجهاز"
                  value={deviceId}
                  onChange={setDeviceId}
                  autoComplete="off"
                  error={actionData?.errors?.deviceId}
                  helpText="معرف فريد للجهاز الذي سيستقبل الطلبات لهذا الفرع"
                  requiredIndicator
                />

                <Button primary submit>إنشاء الفرع</Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
