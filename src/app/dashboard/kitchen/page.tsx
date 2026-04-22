"use client";
import { useEffect, useState, useRef } from "react";
import { formatTime } from "@/lib/utils";
import { playNewOrder, playStatusChange, playSuccess } from "@/lib/audio";
import styles from "./kitchen.module.css";

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders?status=PENDING"); // Optionally show if needed, though mostly cashier handles it
      const preparingRes = await fetch("/api/orders?status=PREPARING");
      const pending = await res.json();
      const preparing = await preparingRes.json();
      
      const all = [...pending, ...preparing].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setOrders(all);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    setCurrentPage(1);

    const eventSource = new EventSource("/api/sync");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "update" && data.changes) {
          fetchOrders(); // Refresh table
          
          // Sound alert per different status
          const changes: any[] = data.changes || [];
          const hasNewOrder = changes.some((o: any) => o.status === "PENDING");
          const hasReady = changes.some((o: any) => o.status === "READY");
          const hasPreparing = changes.some((o: any) => o.status === "PREPARING");

          if (hasNewOrder || hasPreparing) playNewOrder();
          else if (hasReady) playSuccess();
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };

    return () => eventSource.close();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      // the SSE will trigger fetchOrders across all tabs
      await fetchOrders();
    } catch {}
    setUpdating(null);
  };

  const getWaitTime = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "Vừa xong";
    return `${diff} phút`;
  };

  const getWaitColor = (createdAt: string) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 5) return "var(--green)";
    if (diff < 10) return "var(--yellow)";
    return "var(--red)";
  };

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className={styles.kitchenLayout}>
      {/* Header */}
      <div className={styles.kitchenHeader}>
        <div>
          <h1 className={styles.kitchenTitle}>🍹 Màn hình pha chế</h1>
          <p className={styles.kitchenSub}>Auto refresh mỗi 5 giây</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            LIVE
          </div>
          <div className={styles.orderCount}>
            <span className={styles.orderCountNum}>{orders.length}</span>
            <span className={styles.orderCountLabel}>đơn chờ</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>🔄</button>
        </div>
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p>Đang tải đơn hàng...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✨</div>
          <h2>Không có đơn nào cần pha chế</h2>
          <p>Hãy nghỉ ngơi một chút, đơn mới sẽ hiển thị tự động</p>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {paginatedOrders.map((order) => (
            <div
              key={order.id}
              className={`${styles.orderCard} ${order.status === "PREPARING" ? styles.preparing : styles.pending}`}
            >
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.orderNum}>#{order.orderNumber}</div>
                <div className={styles.waitTime} style={{ color: getWaitColor(order.createdAt) }}>
                  ⏱ {getWaitTime(order.createdAt)}
                </div>
                <div className={`${styles.statusBadge} ${order.status === "PREPARING" ? styles.preparing : styles.pending}`}>
                  {order.status === "PREPARING" ? "🔵 Đang pha" : "🟡 Chờ pha"}
                </div>
              </div>

              {/* Customer */}
              {order.customerName && (
                <div className={styles.customer}>
                  👤 {order.customerName}
                  {order.customerPhone && <span> · {order.customerPhone}</span>}
                </div>
              )}

              {/* Items */}
              <div className={styles.itemsList}>
                {order.items?.map((item: any) => (
                  <div key={item.id} className={styles.item}>
                    <div className={styles.itemQtyBadge}>{item.quantity}</div>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemName}>{item.product?.name}</div>
                      <div className={styles.itemMeta}>
                        {item.sizeName && <span className={styles.itemTag}>{item.sizeName}</span>}
                        {item.toppings?.map((t: any) => (
                          <span key={t.id} className={styles.itemTag}>{t.topping?.name}</span>
                        ))}
                      </div>
                      {item.note && (
                        <div className={styles.itemNote}>📝 {item.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order note */}
              {order.note && (
                <div className={styles.orderNote}>
                  📌 {order.note}
                </div>
              )}

              {/* Footer: time + action */}
              <div className={styles.cardFooter}>
                <span className={styles.orderTime}>{formatTime(order.createdAt)}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {order.status === "PENDING" && (
                    <button
                      className={`btn ${styles.btnPrepare}`}
                      onClick={() => updateStatus(order.id, "PREPARING")}
                      disabled={updating === order.id}
                    >
                      {updating === order.id ? <span className="loading-spinner" /> : "🔵 Bắt đầu pha"}
                    </button>
                  )}
                  {order.status === "PREPARING" && (
                    <button
                      className={`btn ${styles.btnReady}`}
                      onClick={() => updateStatus(order.id, "READY")}
                      disabled={updating === order.id}
                    >
                      {updating === order.id ? <span className="loading-spinner" /> : "✅ Đã xong"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && orders.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginTop: "24px", paddingBottom: "24px" }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Trước
          </button>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Trang {currentPage} / {totalPages}
          </div>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
