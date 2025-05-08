// app/components/OrderForm.tsx
import { useState } from "react";
import {
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  VerticalStack,
  Box,
  InlineGrid
} from "@shopify/polaris";
import { useOrderRouting } from "~/hooks/useOrderRouting";

interface CartItem {
  id: string;
  menuItem: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface OrderFormProps {
  branchId: string;
  cartItems: CartItem[];
  totalAmount: number;
  onSuccess?: (orderNumber: string) => void;
  onCancel?: () => void;
}

export function OrderForm({ branchId, cartItems, totalAmount, onSuccess, onCancel }: OrderFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const { submitOrder, isSubmitting, error, orderNumber, clearError } = useOrderRouting({
    onSuccess: (newOrderNumber) => {
      if (onSuccess) {
        onSuccess(newOrderNumber);
      }
    }
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Format order data
    const orderData = {
      branchId,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      notes: notes.trim() || null,
      totalAmount,
      items: cartItems.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price
      }))
    };

    try {
      await submitOrder(orderData);
    } catch (err) {
      // Error handling is done via the useOrderRouting hook
      console.error("Order submission failed:", err);
    }
  };

  // If order was successfully placed
  if (orderNumber) {
    return (
      <Card>
        <Card.Section>
          <VerticalStack gap="4">
            <Box paddingBlockEnd="4" borderBlockEndWidth="1" borderColor="border">
              <Text variant="headingLg" as="h2">Order Confirmation</Text>
            </Box>

            <Banner status="success">
              Your order has been placed successfully!
            </Banner>

            <VerticalStack gap="2">
              <Text variant="headingMd">Order Number: {orderNumber}</Text>
              <Text>Thank you for your order. You will receive updates about your order status.</Text>
            </VerticalStack>

            <Button onClick={onCancel} primary>Continue Shopping</Button>
          </VerticalStack>
        </Card.Section>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Section>
        <VerticalStack gap="4">
          <Box paddingBlockEnd="4" borderBlockEndWidth="1" borderColor="border">
            <Text variant="headingLg" as="h2">Checkout</Text>
          </Box>

          {error && (
            <Banner status="critical" onDismiss={clearError}>
              {error}
            </Banner>
          )}

          <form onSubmit={handleSubmit}>
            <FormLayout>
              <Text variant="headingMd">Customer Information</Text>

              <TextField
                label="Name"
                value={customerName}
                onChange={setCustomerName}
                autoComplete="name"
              />

              <TextField
                label="Phone Number"
                type="tel"
                value={customerPhone}
                onChange={setCustomerPhone}
                autoComplete="tel"
              />

              <TextField
                label="Order Notes (optional)"
                value={notes}
                onChange={setNotes}
                multiline={3}
              />

              <Box paddingBlockStart="4" borderBlockStartWidth="1" borderColor="border-subdued">
                <VerticalStack gap="4">
                  <InlineGrid columns="2" gap="4">
                    <Text>Total</Text>
                    <Text alignment="end" fontWeight="bold">${totalAmount.toFixed(2)}</Text>
                  </InlineGrid>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button primary submit loading={isSubmitting}>Place Order</Button>
                  </div>
                </VerticalStack>
              </Box>
            </FormLayout>
          </form>
        </VerticalStack>
      </Card.Section>
    </Card>
  );
}
