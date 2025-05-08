// app/utils/order-utils.ts

// أنواع البيانات
export interface OrderData {
  branchId: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  items: OrderItemData[];
}

export interface OrderItemData {
  menuItemId: string;
  quantity: number;
  price: number;
  note?: string;
}

// حساب إجمالي سعر الطلب
export function calculateOrderTotal(items: OrderItemData[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// تنسيق رقم الطلب
export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.startsWith('ORD-') ? orderNumber : `ORD-${orderNumber}`;
}

// إنشاء رقم طلب جديد فريد
export function generateOrderNumber(lastOrderNumber?: string): string {
  if (!lastOrderNumber) {
    return `ORD-${String(Date.now()).slice(-6).padStart(6, '0')}`;
  }

  const lastNumber = parseInt(lastOrderNumber.split('-')[1] || '0');
  return `ORD-${String(lastNumber + 1).padStart(6, '0')}`;
}

// الحصول على نص حالة الطلب بالعربية
export function getOrderStatusText(status: string): string {
  const statusMap = {
    'PENDING': 'معلق',
    'PREPARING': 'قيد التحضير',
    'READY': 'جاهز',
    'COMPLETED': 'مكتمل',
    'CANCELLED': 'ملغي'
  };

  return statusMap[status] || status;
}

// التحقق من صلاحية بيانات الطلب
export function validateOrderData(orderData: OrderData): { isValid: boolean; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!orderData.branchId) {
    errors.branchId = 'الفرع مطلوب';
  }

  if (orderData.totalAmount <= 0) {
    errors.totalAmount = 'المبلغ يجب أن يكون أكبر من صفر';
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.items = 'يجب إضافة عناصر للطلب';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// تنسيق التاريخ للعرض
export function formatOrderDate(date: Date | string): string {
  const orderDate = typeof date === 'string' ? new Date(date) : date;
  return orderDate.toLocaleString('ar-SA');
}
