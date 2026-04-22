export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateOrderNumber(): number {
  const now = new Date();
  return parseInt(
    `${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`
  );
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Chờ xử lý",
    PREPARING: "Đang pha chế",
    READY: "Sẵn sàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return labels[status] || status;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "Tiền mặt",
    TRANSFER: "Chuyển khoản",
    CARD: "Thẻ",
  };
  return labels[method] || method;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "#f59e0b",
    PREPARING: "#3b82f6",
    READY: "#8b5cf6",
    COMPLETED: "#10b981",
    CANCELLED: "#ef4444",
  };
  return colors[status] || "#6b7280";
}
