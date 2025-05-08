// app/hooks/useOrderRouting.ts
import { useState, useCallback } from "react";

interface OrderData {
  branchId: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  items: Array<{
    menuItemId: string;
    quantity: number;
    price: number;
    note?: string;
  }>;
}

interface UseOrderRoutingOptions {
  onSuccess?: (orderNumber: string) => void;
  onError?: (error: Error) => void;
}

export function useOrderRouting(options: UseOrderRoutingOptions = {}) {
  const { onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  // Submit an order to the selected branch
  const submitOrder = useCallback(async (orderData: OrderData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData,
          orderItems: orderData.items
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit order");
      }

      const result = await response.json();
      const newOrderNumber = result.order.orderNumber;

      // Save to state
      setOrderNumber(newOrderNumber);

      // Call success callback
      if (onSuccess) {
        onSuccess(newOrderNumber);
      }

      return newOrderNumber;
    } catch (err) {
      console.error("Error submitting order:", err);
      setError(err.message || "An error occurred while submitting your order");

      // Call error callback
      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSuccess, onError]);

  // Get the status of an order
  const checkOrderStatus = useCallback(async (orderNumber: string) => {
    try {
      const response = await fetch(`/api/orders/status?orderNumber=${orderNumber}`);

      if (!response.ok) {
        throw new Error("Failed to check order status");
      }

      const result = await response.json();
      return result.status;
    } catch (err) {
      console.error("Error checking order status:", err);
      throw err;
    }
  }, []);

  return {
    submitOrder,
    checkOrderStatus,
    isSubmitting,
    error,
    orderNumber,
    clearError: () => setError(null)
  };
}
