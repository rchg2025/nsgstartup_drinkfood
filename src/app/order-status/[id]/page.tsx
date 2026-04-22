import { prisma } from "@/lib/prisma";
import { formatCurrency, getStatusLabel } from "@/lib/utils";
import styles from "./orderstatus.module.css";
import OrderSync from "./OrderSync";

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let order: any = null;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, toppings: { include: { topping: true } } } },
      },
    });
  } catch {}

  if (!order) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>😕</div>
          <h2>Không tìm thấy đơn hàng</h2>
          <p>Đơn hàng không tồn tại hoặc đã bị xóa.</p>
        </div>
      </div>
    );
  }

  const statusSteps = ["PENDING", "PREPARING", "READY", "COMPLETED"];
  const currentStep = order.status === "CANCELLED" ? -1 : statusSteps.indexOf(order.status);

  const statusMessages: Record<string, { icon: string; title: string; desc: string }> = {
    PENDING: { icon: "⏳", title: "Đơn hàng đang chờ xử lý", desc: "Nhân viên pha chế sẽ bắt đầu ngay" },
    PREPARING: { icon: "🧋", title: "Đang pha chế", desc: "Món của bạn đang được pha chế cẩn thận" },
    READY: { icon: "✅", title: "Đồ uống đã sẵn sàng!", desc: "Đến quầy lấy đồ nhé bạn ơi!" },
    COMPLETED: { icon: "🎉", title: "Đơn hàng hoàn thành", desc: "Cảm ơn bạn đã đến với NSG!" },
    CANCELLED: { icon: "❌", title: "Đơn hàng đã bị hủy", desc: "Rất tiếc, đơn hàng của bạn đã bị hủy." },
  };

  const currentMsg = statusMessages[order.status] || statusMessages.PENDING;

  return (
    <div className={styles.container}>
      {/* Logo */}
      <div className={styles.logo}>
        <span>🧋</span>
        <span className={styles.logoText}>NSG STARTUP</span>
      </div>

      <div className={styles.card}>
        {/* Status hero */}
        <div className={styles.statusHero}>
          <div className={styles.statusIcon}>{currentMsg.icon}</div>
          <h1 className={styles.statusTitle}>{currentMsg.title}</h1>
          <p className={styles.statusDesc}>{currentMsg.desc}</p>
        </div>

        {/* Order info */}
        <div className={styles.orderInfo}>
          <div className={styles.orderNum}>Đơn #{order.orderNumber}</div>
          {order.customerName && <div className={styles.customerName}>👤 {order.customerName}</div>}
        </div>

        {/* Progress stepper */}
        {order.status !== "CANCELLED" && (
          <div className={styles.stepper}>
            {statusSteps.map((step, idx) => (
              <div key={step} className={styles.stepWrap}>
                <div className={`${styles.step} ${idx <= currentStep ? styles.stepDone : ""} ${idx === currentStep ? styles.stepCurrent : ""}`}>
                  {idx < currentStep ? "✓" : idx + 1}
                </div>
                <div className={`${styles.stepLabel} ${idx === currentStep ? styles.stepLabelActive : ""}`}>
                  {getStatusLabel(step)}
                </div>
                {idx < statusSteps.length - 1 && (
                  <div className={`${styles.stepLine} ${idx < currentStep ? styles.stepLineDone : ""}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Items */}
        <div className={styles.itemsList}>
          <h3 className={styles.itemsTitle}>Chi tiết đơn hàng</h3>
          {order.items.map((item: any) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemLeft}>
                <div className={styles.itemName}>{item.product?.name}</div>
                <div className={styles.itemMeta}>
                  {item.sizeName && <span className={styles.itemTag}>{item.sizeName}</span>}
                  {item.toppings?.map((t: any) => (
                    <span key={t.id} className={styles.itemTag}>{t.topping?.name}</span>
                  ))}
                </div>
              </div>
              <div className={styles.itemRight}>
                <span className={styles.itemQty}>x{item.quantity}</span>
                <span className={styles.itemPrice}>{formatCurrency(item.totalPrice)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className={styles.totalRow}>
          {order.discount > 0 && (
            <div className={styles.discountRow}>
              <span>Giảm giá</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className={styles.total}>
            <span>Tổng cộng</span>
            <span className={styles.totalAmount}>{formatCurrency(order.finalAmount)}</span>
          </div>
        </div>

        <div className={styles.refreshHint}>
          🔄 Trang này tự động cập nhật liên tục (Real-time).
        </div>
      </div>

      <OrderSync id={order.id} initialStatus={order.status} />
    </div>
  );
}
