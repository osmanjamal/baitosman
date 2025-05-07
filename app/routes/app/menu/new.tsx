// app/routes/app/menu/new.tsx
import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
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
  Toggle,
  DropZone,
  Thumbnail,
  Stack,
  Checkbox
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../../../shopify.server";
import { prisma } from "../../../db.server";

export async function loader({ request }) {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branchId");

  // جلب جميع الفروع النشطة
  const branches = await prisma.branch.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // جلب فئات القائمة الموجودة
  const categories = await prisma.menuItem.groupBy({
    by: ['category'],
    where: {
      category: {
        not: null
      }
    },
    orderBy: {
      category: 'asc'
    }
  });

  return json({
    branches,
    categories: categories.map(c => c.category),
    selectedBranchId: branchId || ""
  });
}

export async function action({ request }) {
  await authenticate.admin(request);

  const formData = await request.formData();

  const name = formData.get("name");
  const description = formData.get("description");
  const price = formData.get("price");
  const category = formData.get("category");
  const newCategory = formData.get("newCategory");
  const branchId = formData.get("branchId");
  const isAvailable = formData.get("isAvailable") === "true";

  // التحقق من البيانات المطلوبة
  if (!name || !price || !branchId) {
    return json({
      errors: {
        name: !name ? "اسم العنصر مطلوب" : null,
        price: !price ? "السعر مطلوب" : null,
        branchId: !branchId ? "الفرع مطلوب" : null
      }
    }, { status: 400 });
  }

  // التحقق من صحة السعر
  const priceValue = parseFloat(price);
  if (isNaN(priceValue) || priceValue <= 0) {
    return json({
      errors: {
        price: "يجب أن يكون السعر رقمًا موجبًا"
      }
    }, { status: 400 });
  }

  // استخدام الفئة الجديدة إذا تم توفيرها
  const finalCategory = newCategory && newCategory.trim() !== ""
    ? newCategory.trim()
    : (category || "عام");

  try {
    // إنشاء عنصر القائمة الجديد
    await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price: priceValue,
        category: finalCategory,
        isAvailable,
        branchId
      }
    });

    // إعادة التوجيه إلى صفحة قائمة الطعام مع تحديد الفرع
    return redirect(`/app/menu?branchId=${branchId}`);
  } catch (error) {
    console.error("Error creating menu item:", error);
    return json({
      errors: {
        form: "حدث خطأ أثناء إنشاء عنصر القائمة"
      }
    }, { status: 500 });
  }
}

export default function NewMenuItem() {
  const { branches, categories, selectedBranchId } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("عام");
  const [newCategory, setNewCategory] = useState("");
  const [branchId, setBranchId] = useState(selectedBranchId);
  const [isAvailable, setIsAvailable] = useState(true);
  const [useNewCategory, setUseNewCategory] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("newCategory", newCategory);
    formData.append("branchId", branchId);
    formData.append("isAvailable", isAvailable.toString());

    submit(formData, { method: "post" });
  };

  const branchOptions = [
    { label: "اختر فرعًا", value: "" },
    ...branches.map(branch => ({
      label: branch.name,
      value: branch.id
    }))
  ];

  const categoryOptions = [
    { label: "عام", value: "عام" },
    ...categories.map(category => ({
      label: category,
      value: category
    }))
  ];

  return (
    <Page
      title="إضافة عنصر قائمة جديد"
      backAction={{ content: "قائمة الطعام", url: `/app/menu${branchId ? `?branchId=${branchId}` : ''}` }}
    >
      <TitleBar title="إضافة عنصر قائمة جديد" />

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
                <Select
                  label="الفرع"
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchId}
                  error={actionData?.errors?.branchId}
                  requiredIndicator
                />

                <TextField
                  label="اسم العنصر"
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
                  label="السعر (ريال)"
                  value={price}
                  onChange={setPrice}
                  type="number"
                  step="0.01"
                  autoComplete="off"
                  error={actionData?.errors?.price}
                  requiredIndicator
                />

                <Checkbox
                  label="إضافة فئة جديدة"
                  checked={useNewCategory}
                  onChange={setUseNewCategory}
                />

                {useNewCategory ? (
                  <TextField
                    label="الفئة الجديدة"
                    value={newCategory}
                    onChange={setNewCategory}
                    autoComplete="off"
                  />
                ) : (
                  <Select
                    label="الفئة"
                    options={categoryOptions}
                    value={category}
                    onChange={setCategory}
                  />
                )}

                <Toggle
                  label="متاح للطلب"
                  checked={isAvailable}
                  onChange={setIsAvailable}
                />

                <div style={{ marginTop: '1rem' }}>
                  <Button primary submit>إنشاء عنصر قائمة</Button>
                </div>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
