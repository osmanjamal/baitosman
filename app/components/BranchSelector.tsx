import { Card, Button, BlockStack, Text, Heading } from "@shopify/polaris";

interface Branch {
  id: string;
  name: string;
  description?: string;
}

interface BranchSelectorProps {
  branches: Branch[];
  onSelectBranch: (branchId: string) => void;
}

export function BranchSelector({ branches, onSelectBranch }: BranchSelectorProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Heading>اختر الفرع</Heading>
        <Text>الرجاء اختيار الفرع المطلوب لعرض قائمة الطعام</Text>

        <BlockStack gap="300">
          {branches.map((branch) => (
            <Button
              key={branch.id}
              onClick={() => onSelectBranch(branch.id)}
              variant="primary"
              fullWidth
            >
              {branch.name}
              {branch.description && <div className="branch-description">{branch.description}</div>}
            </Button>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
