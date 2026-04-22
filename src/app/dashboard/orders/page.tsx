"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate, getStatusLabel, getPaymentMethodLabel } from "@/lib/utils";
import { playNewOrder, playStatusChange, playSuccess } from "@/lib/audio";
import styles from "./orders.module.css";

const STATUS_OPTIONS = ["", "PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  // Get current date in VN timezone
  const vnDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [startDate, setStartDate] = useState(vnDateStr);
  const [endDate, setEndDate] = useState(vnDateStr);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [pointAwardStep, setPointAwardStep] = useState(1);
  const [customerPhoneInput, setCustomerPhoneInput] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = "/api/orders?";
      if (statusFilter) url += `status=${statusFilter}&`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}`;
      const res = await fetch(url);
      setOrders(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { 
    fetchOrders(); 
    setCurrentPage(1);
  }, [statusFilter, startDate, endDate]);

  // Real-time synchronization
  useEffect(() => {
    const eventSource = new EventSource("/api/sync");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "update" && data.changes) {
          fetchOrders();
          
          // Distinct sounds per status change
          const changes: any[] = data.changes || [];
          const hasNewOrder = changes.some((o: any) => o.status === "PENDING");
          const hasReady = changes.some((o: any) => o.status === "READY");
          const hasCompleted = changes.some((o: any) => o.status === "COMPLETED");
          const hasOtherChange = changes.some((o: any) => o.status === "PREPARING");

          if (hasNewOrder) playNewOrder();
          else if (hasReady || hasCompleted) playSuccess();
          else if (hasOtherChange) playStatusChange();
        }
      } catch (e) {}
    };
    return () => eventSource.close();
  }, [statusFilter, startDate, endDate]); // Safe to re-subscribe if filters change


  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        const res = await fetch(`/api/orders/${orderId}`);
        setSelectedOrder(await res.json());
      }
    } catch {}
    setUpdating(false);
  };

  const updatePayment = async (orderId: string, paymentStatus: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      await fetchOrders();
    } catch {}
    setUpdating(false);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này không? Dữ liệu sẽ không thể khôi phục.")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchOrders();
        if (selectedOrder?.id === orderId) setSelectedOrder(null);
      } else {
        alert("Có lỗi xảy ra khi xóa đơn hàng.");
      }
    } catch {
      alert("Có lỗi xảy ra khi xóa đơn hàng.");
    }
    setUpdating(false);
  };

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhoneInput) return alert("Vui lòng nhập số điện thoại");
    setUpdating(true);
    try {
      const res = await fetch(`/api/customers?q=${customerPhoneInput}`);
      const data = await res.json();
      const existing = data.find((c: any) => c.phone === customerPhoneInput);
      
      if (existing) {
        // Có khách hàng -> Thực hiện cộng điểm luôn
        await executePointAward(customerPhoneInput, existing.name);
      } else {
        // Chưa có khách hàng -> Sang bước 2
        setPointAwardStep(2);
      }
    } catch {
      alert("Đã xảy ra lỗi kiểm tra số điện thoại");
    }
    setUpdating(false);
  };

  const executePointAward = async (phone: string, name: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${awardingPoints}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: phone,
          customerName: name
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Tích điểm thành công: +${data.earnedPoints} điểm!`);
        setAwardingPoints(false);
        setCustomerPhoneInput("");
        setCustomerNameInput("");
        setPointAwardStep(1);
        await fetchOrders();
        if (selectedOrder?.id === awardingPoints) {
          const upRes = await fetch(`/api/orders/${awardingPoints}`);
          setSelectedOrder(await upRes.json());
        }
      } else {
        alert("Lỗi: " + data.error);
        setPointAwardStep(1);
      }
    } catch {
      alert("Đã xảy ra lỗi khi tích điểm");
    }
    setUpdating(false);
  };

  const awardPointsManually = async (e: React.FormEvent) => {
    e.preventDefault();
    await executePointAward(customerPhoneInput, customerNameInput);
  };

  const statusColors: Record<string, string> = {
    PENDING: "var(--yellow)",
    PREPARING: "var(--blue)",
    READY: "var(--purple)",
    COMPLETED: "var(--green)",
    CANCELLED: "var(--red)",
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportData = orders.map((o) => ({
        "Mã đơn": `#${o.orderNumber}`,
        "Khách hàng": o.customerName || "Khách lẻ",
        "Điện thoại": o.customerPhone || "",
        "Thu ngân": o.cashier?.name || "",
        "Số món": o.items?.length || 0,
        "Tổng tiền": o.totalAmount,
        "Giảm giá": o.discount,
        "Thành tiền (VNĐ)": o.finalAmount,
        "Thanh toán": o.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán",
        "Trạng thái": getStatusLabel(o.status),
        "Thời gian": new Date(o.createdAt).toLocaleString("vi-VN"),
        "Ghi chú": o.note || ""
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns slightly
      const colWidths = [
         { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 10 },
         { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
         { wch: 20 }, { wch: 25 }
      ];
      worksheet["!cols"] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DonHang");
      XLSX.writeFile(workbook, `DanhSachDonHang_${startDate || "TatCa"}_${endDate || "TatCa"}.xlsx`);
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.finalAmount, 0);

  const totalCost = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.items || []).reduce((itemSum: number, item: any) => itemSum + (item.unitCostPrice * item.quantity), 0), 0);

  const totalProfit = totalRevenue - totalCost;
  const netProfit = totalProfit * 0.5;

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Quản lý đơn hàng</h1>
          <p className="page-subtitle">Theo dõi và cập nhật trạng thái đơn hàng</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" onClick={fetchOrders}>🔄 Làm mới</button>
          <button className="btn btn-primary" onClick={exportExcel} disabled={orders.length === 0}>
            📥 Xuất Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters} style={{ flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Từ:</span>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "auto" }}
          />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Đến:</span>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "auto" }}
          />
          {(startDate || endDate) ? (
            <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(""); setEndDate(""); }}>Xem tất cả</button>
          ) : (
             <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(vnDateStr); setEndDate(vnDateStr); }}>Hôm nay</button>
          )}
        </div>
        <div className={styles.statusTabs}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`${styles.statusTab} ${statusFilter === s ? styles.active : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "" ? "Tất cả" : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum}>{orders.length}</span>
          <span className={styles.summaryLabel}>Tổng đơn</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum} style={{ color: "var(--yellow)" }}>
            {orders.filter(o => o.status === "PENDING").length}
          </span>
          <span className={styles.summaryLabel}>Chờ xử lý</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum} style={{ color: "var(--blue)" }}>
            {orders.filter(o => o.status === "PREPARING").length}
          </span>
          <span className={styles.summaryLabel}>Đang pha</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum} style={{ color: "var(--green)" }}>
            {formatCurrency(totalRevenue)}
          </span>
          <span className={styles.summaryLabel}>Doanh thu hôm nay</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum} style={{ color: "var(--purple)" }}>
            {formatCurrency(totalProfit)}
          </span>
          <span className={styles.summaryLabel}>Lợi nhuận</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryNum} style={{ color: "var(--accent)" }}>
            {formatCurrency(netProfit)}
          </span>
          <span className={styles.summaryLabel}>Lợi nhuận ròng</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <div className="loading-spinner" style={{ margin: "0 auto 12px" }} /> Đang tải...
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Không có đơn hàng nào</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Đơn #</th>
                  <th>Khách hàng</th>
                  <th>Món</th>
                  <th>Tổng tiền</th>
                  <th>TT Thanh toán</th>
                  <th>Thu ngân</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => setSelectedOrder(order)}>
                    <td><strong style={{ color: "var(--accent)" }}>#{order.orderNumber}</strong></td>
                    <td>
                      <div>
                        {order.customerName
                          ? order.customerName
                          : order.customerPhone
                          ? "Khách"
                          : "Khách lẻ"}
                      </div>
                      {order.customerPhone && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{order.customerPhone}</div>}
                    </td>
                    <td>{order.items?.length || 0} món</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(order.finalAmount)}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: order.paymentStatus === "PAID" ? "var(--green)" : "var(--yellow)"
                      }}>
                        {order.paymentStatus === "PAID" ? "✅ Đã thanh toán" : "⏳ Chưa TT"}
                      </span>
                    </td>
                    <td>{order.cashier?.name || "Khách lẻ"}</td>
                    <td>
                      <span className={`badge badge-${order.status.toLowerCase()}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {formatDate(order.createdAt)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {order.status === "PENDING" && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(order.id, "PREPARING")} disabled={updating}>
                            Pha chế
                          </button>
                        )}
                        {order.status === "READY" && (
                          <button className="btn btn-primary btn-sm" onClick={() => updateStatus(order.id, "COMPLETED")} disabled={updating}>
                            Hoàn thành
                          </button>
                        )}
                        {(order.status === "PENDING" || order.status === "PREPARING") && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => { window.location.href = `/dashboard/pos?editOrderId=${order.id}`; }}
                            >
                              Sửa đơn
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, "CANCELLED")} disabled={updating}>
                              Hủy
                            </button>
                          </>
                        )}
                        {order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updatePayment(order.id, "PAID")} disabled={updating}>
                            💳 TT
                          </button>
                        )}
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => deleteOrder(order.id)} disabled={updating} title="Xóa đơn hàng">
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, orders.length)} trên tổng số {orders.length} đơn
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    Trước
                  </button>
                  <div style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: 14, fontWeight: 500 }}>
                    Trang {currentPage} / {totalPages}
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết đơn #{selectedOrder.orderNumber}</h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {(selectedOrder.status === "PENDING" || selectedOrder.status === "PREPARING") && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      window.location.href = `/dashboard/pos?editOrderId=${selectedOrder.id}`;
                    }}
                  >
                    ✏️ Sửa đơn
                  </button>
                )}
                <button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <div className={styles.detailLabel}>Khách hàng</div>
                <div className={styles.detailValue}>
                  {selectedOrder.customerName
                    ? selectedOrder.customerName
                    : selectedOrder.customerPhone
                    ? "Khách"
                    : "Khách lẻ"}
                </div>
              </div>
              {selectedOrder.customerPhone && (
                <div>
                  <div className={styles.detailLabel}>Điện thoại</div>
                  <div className={styles.detailValue}>{selectedOrder.customerPhone}</div>
                </div>
              )}
              <div>
                <div className={styles.detailLabel}>Thu ngân</div>
                <div className={styles.detailValue}>{selectedOrder.cashier?.name || "—"}</div>
              </div>
              <div>
                <div className={styles.detailLabel}>Thanh toán</div>
                <div className={styles.detailValue}>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</div>
              </div>
            </div>

            <div className="divider" />

            <div className={styles.orderItems}>
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className={styles.orderItem}>
                  <div className={styles.orderItemInfo}>
                    <div className={styles.orderItemName}>{item.product?.name}</div>
                    <div className={styles.orderItemMeta}>
                      {item.sizeName && <span className="tag">{item.sizeName}</span>}
                      {item.toppings?.map((t: any) => (
                        <span key={t.id} className="tag">{t.topping?.name}</span>
                      ))}
                    </div>
                    {item.note && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📝 {item.note}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>x{item.quantity}</div>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(item.totalPrice)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
              <span>Tổng cộng</span>
              <span style={{ color: "var(--accent)" }}>{formatCurrency(selectedOrder.finalAmount)}</span>
            </div>

            {selectedOrder.note && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                📝 {selectedOrder.note}
              </div>
            )}
            
            {!selectedOrder.isPointAwarded && selectedOrder.status !== "CANCELLED" && (
              <div style={{ marginTop: 20 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", background: "var(--purple)", color: "white" }}
                  onClick={() => {
                    setAwardingPoints(selectedOrder.id);
                    setPointAwardStep(1);
                    setCustomerPhoneInput("");
                    setCustomerNameInput("");
                  }}
                >
                  🎁 Tích điểm thủ công
                </button>
              </div>
            )}
            {selectedOrder.isPointAwarded && (
              <div style={{ marginTop: 20, textAlign: "center", color: "var(--green)", fontWeight: 500 }}>
                ✅ Đơn hàng này đã được tích điểm
              </div>
            )}
          </div>
        </div>
      )}

      {/* Award Points Modal */}
      {awardingPoints && (
        <div className="modal-overlay" onClick={() => setAwardingPoints(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🎁 Tích điểm Khách Hàng</h2>
              <button className="modal-close" onClick={() => setAwardingPoints(false)}>✕</button>
            </div>
            
            {pointAwardStep === 1 ? (
              <form onSubmit={handleCheckPhone} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Nhập số điện thoại khách hàng *</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="Ví dụ: 0912345678" 
                    value={customerPhoneInput}
                    onChange={e => setCustomerPhoneInput(e.target.value)}
                    required
                  />
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Hệ thống sẽ tra cứu xem khách đã có tài khoản chưa để cộng điểm.
                </p>
                <button type="submit" className="btn btn-primary" style={{ background: "var(--purple)", color: "white" }} disabled={updating}>
                  {updating ? "Đang tra cứu..." : "Kiểm tra & Tích điểm"}
                </button>
              </form>
            ) : (
              <form onSubmit={awardPointsManually} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
                <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 13, color: "var(--yellow)" }}>
                  ⚠️ Khách hàng mới! Vui lòng nhập thêm Họ tên để tạo tài khoản.
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={customerPhoneInput}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Họ Tên Khách Hàng *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Nhập tên khách..." 
                    value={customerNameInput}
                    onChange={e => setCustomerNameInput(e.target.value)}
                    required
                  />
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Bạn đang cộng tích lũy 1% giá trị hóa đơn (khoảng {formatCurrency(Math.floor((selectedOrder?.finalAmount || 0) * 0.01))}).
                </p>
                <button type="submit" className="btn btn-primary" style={{ background: "var(--green)", color: "white" }} disabled={updating}>
                  Xác nhận Tạo Mới & Cộng Điểm
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
