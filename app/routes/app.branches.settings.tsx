// app/routes/app.branches.settings.tsx
import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Select,
  Banner,
  Toast,
  TextContainer,
  Text
} from "@shopify/polaris";
import { requireAuth } from "~/shopify.server";
import { getAllBranches } from "~/models/branch.server";

// يفترض أن لدينا نموذج/خدمة إعدادات لحفظ إعدادات التطبيق
async function getAppSettings() {
  // سيتم تنفيذ هذا للجلب من قاعدة البيانات الخاصة بك
  return {
    defaultBranchId: '',
    orderNotificationEmail: '',
    enableOrderSound: true,
    minimumOrderAmount: 0,
  };
}

async function saveAppSettings(settings) {
  // سيتم تنفيذ هذا للحفظ في قاعدة البيانات الخاصة بك
  return settings;
}

export async function loader({ request }) {
  await requireAuth(request);

  const branches = await getAllBranches();
  const appSettings = await getAppSettings();

  return json({ branches, appSettings });
}

export async function action({ request }) {
  await requireAuth(request);

  const formData = await request.formData();

  const defaultBranchId = formData.get("defaultBranchId") as string;
  const orderNotificationEmail = formData.get("orderNotificationEmail") as string;
  const enableOrderSound = formData.get("enableOrderSound") === "true";
  const minimumOrderAmount = Number(formData.get("minimumOrderAmount") || 0);

  try {
    const settings = await saveAppSettings({
      defaultBranchId,
      orderNotificationEmail,
      enableOrderSound,
      minimumOrderAmount
    });

    return json({ settings, success: true });
  } catch (error) {
    return json({ errors: { form: "فشل في حفظ الإعدادات" } }, { status: 500 });
  }
}

export default function BranchSettings() {
  const { branches, appSettings } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [defaultBranchId, setDefaultBranchId] = useState(appSettings.defaultBranchId);
  const [orderNotificationEmail, setOrderNotificationEmail] = useState(appSettings.orderNotificationEmail);
  const [enableOrderSound, setEnableOrderSound] = useState(appSettings.enableOrderSound);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState(appSettings.minimumOrderAmount);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setShowToast(true);
    }
  }, [actionData]);

  const branchOptions = branches.map(branch => ({
    label: branch.name,
    value: branch.id
  }));

  branchOptions.unshift({ label: "-- لا يوجد فرع افتراضي --", value: "" });

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("defaultBranchId", defaultBranchId);
    formData.append("orderNotificationEmail", orderNotificationEmail);
    formData.append("enableOrderSound", enableOrderSound.toString());
    formData.append("minimumOrderAmount", minimumOrderAmount.toString());

    submit(formData, { method: "post" });
  };

  return (
    <Page title="إعدادات الفروع">
      {actionData?.errors?.form && (
        <Banner status="critical">
          <p>{actionData.errors.form}</p>
        </Banner>
      )}

      {showToast && (
        <Toast
          content="تم حفظ الإعدادات بنجاح"
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Layout>
        <Layout.Section>
          <Card>
            <Form method="post" onSubmit={handleSubmit}>
              <FormLayout>
                <Select
                  label="الفرع الافتراضي"
                  options={branchOptions}
                  value={defaultBranchId}
                  onChange={setDefaultBranchId}
                  helpText="الفرع الذي سيتم اختياره افتراضيًا عند زيارة العملاء لموقعك"
                />

                <TextField
                  label="البريد الإلكتروني لإشعارات الطلبات"
                  type="email"
                  value={orderNotificationEmail}
                  onChange={setOrderNotificationEmail}
                  autoComplete="email"
                  helpText="البريد الإلكتروني الذي سيستقبل إشعارات الطلبات الجديدة"
                />

                <Select
                  label="تنبيهات صوتية للطلبات"
                  options={[
                    { label: "مفعل", value: "true" },
                    { label: "معطل", value: "false" }
                  ]}
                  value={enableOrderSound.toString()}
                  onChange={value => setEnableOrderSound(value === "true")}
                  helpText="تشغيل صوت عند استلام طلبات جديدة"
                />

                <TextField
                  label="الحد الأدنى للطلب"
                  type="number"
                  value={minimumOrderAmount.toString()}
                  onChange={value => setMinimumOrderAmount(Number(value))}
                  autoComplete="off"
                  helpText="الحد الأدنى لمبلغ الطلب بعملتك (0 لعدم وجود حد أدنى)"
                />

                <Button primary submit>حفظ الإعدادات</Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section secondary>
          <Card title="حول إعدادات الفروع">
            <Card.Section>
              <TextContainer>
                <Text as="p">
                  تتحكم هذه الإعدادات في طريقة عمل تطبيق المطعم متعدد الفروع.
                </Text>
                <Text as="p">
                  سيتم اختيار الفرع الافتراضي مسبقًا للعملاء الذين لم يختاروا فرعًا من قبل.
                </Text>
                <Text as="p">
                  سيتم إرسال إشعارات الطلبات إلى البريد الإلكتروني المحدد بالإضافة إلى جهاز الفرع.
                </Text>
              </TextContainer>
            </Card.Section>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
