// Handle order routing and device communication
class OrderRouter {
  constructor() {
    this.branchId = localStorage.getItem('selectedBranchId');
    this.deviceId = this.getDeviceId();
    this.setupEventListeners();
  }

  // Get unique device ID or generate one if not exists
  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  setupEventListeners() {
    // Listen for order submissions
    document.addEventListener('orderSubmitted', (event) => {
      const orderData = event.detail;
      this.routeOrderToBranch(orderData);
    });

    // Listen for device registration
    document.addEventListener('deviceRegistered', (event) => {
      const { branchId } = event.detail;
      this.registerDevice(branchId);
    });
  }

  // Route the order to the selected branch
  async routeOrderToBranch(orderData) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderData: {
            ...orderData,
            branchId: this.branchId
          },
          orderItems: orderData.items
        }),
      });

      const result = await response.json();

      if (result.order) {
        // Display success message with order number
        this.showOrderConfirmation(result.order.orderNumber);
      }
    } catch (error) {
      console.error('Error routing order:', error);
    }
  }

  // Register device with a specific branch
  async registerDevice(branchId) {
    try {
      const response = await fetch('/api/branches/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          branchId
        }),
      });

      const result = await response.json();
      console.log('Device registered:', result);
    } catch (error) {
      console.error('Error registering device:', error);
    }
  }

  // Show order confirmation to user
  showOrderConfirmation(orderNumber) {
    const confirmationElement = document.createElement('div');
    confirmationElement.className = 'order-confirmation';
    confirmationElement.innerHTML = `
      <h3>${window.theme.translations.order.success}</h3>
      <p>${window.theme.translations.order.order_number}: ${orderNumber}</p>
    `;

    document.body.appendChild(confirmationElement);

    // Remove confirmation after 5 seconds
    setTimeout(() => {
      confirmationElement.remove();
    }, 5000);
  }
}

// Initialize the order router when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.orderRouter = new OrderRouter();
});
