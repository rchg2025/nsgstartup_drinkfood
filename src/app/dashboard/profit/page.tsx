"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function ProfitStatsPage() {
  const [data, setData] = useState<{ orders: any[]; cashiers: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "cashiers" | "withdrawals">("orders");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashierFilter, setCashierFilter] = useState("");
  const [cashiersList, setCashiersList] = useState<any[]>([]);
  
  // Withdrawal State
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [withdrawingCashier, setWithdrawingCashier] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Pagination States
  const ITEMS_PER_PAGE = 20;
  const [ordersPage, setOrdersPage] = useState(1);
  const [cashiersPage, setCashiersPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);

  const fetchCashiers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        setCashiersList(users.filter((u: any) => u.role === "CASHIER" || u.role === "ADMIN"));
      }
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/api/stats/profit?";
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (cashierFilter) url += `cashierId=${cashierFilter}&`;
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    try {
      let url = "/api/stats/withdraw?";
      if (cashierFilter) url += `cashierId=${cashierFilter}&`;
      const res = await fetch(url);
      if (res.ok) {
        setWithdrawHistory(await res.json());
      }
    } catch {}
    setLoadingWithdrawals(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return alert("Số tiền rút không hợp lệ");
    if (amount > withdrawingCashier.available) {
      return alert("Số tiền nhập vượt quá số hoa hồng bạn đang có!");
    }

    setSubmittingWithdraw(true);
    try {
       const res = await fetch("/api/stats/withdraw", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ userId: withdrawingCashier.id, amount, available: withdrawingCashier.available })
       });
       if (res.ok) {
         alert("Rút tiền thành công!");
         setWithdrawingCashier(null);
         setWithdrawAmount("");
         fetchData();
         fetchWithdrawals();
       } else {
         const d = await res.json();
         alert("Lỗi: " + d.error);
       }
    } catch {
       alert("Lỗi mạng");
    }
    setSubmittingWithdraw(false);
  };

  const syncCosts = async () => {
    if (!confirm("Hành động này sẽ cập nhật giá gốc hiện hành cho tất cả các đơn hàng cũ. Bạn có chắc chắn?")) return;
    try {
      const res = await fetch("/api/stats/sync-cost", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        alert(`Đã đồng bộ thành công ${result.count} mục.`);
        fetchData();
      } else {
        alert("Lỗi khi đồng bộ.");
      }
    } catch (e) {
      alert("Lỗi khi kết nối.");
    }
  };

  const exportOrdersXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      if (!data?.orders) return;
      const exportData = data.orders.map((o) => ({
        "Mã Đơn": `#${o.orderNumber}`,
        "Thời gian": new Date(o.createdAt).toLocaleString("vi-VN"),
        "Thu ngân": o.cashier?.name || "Khách lẻ",
        "Doanh thu": o.finalAmount,
        "Tổng giá gốc": o.totalCost,
        "Lợi nhuận": o.profit
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LoiNhuanDonHang");
      const fileName = `LoiNhuanDonHang_${startDate || "TatCa"}_${endDate || "TatCa"}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  const exportCashiersXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      if (!data?.cashiers) return;
      const exportData = data.cashiers.map((c) => ({
        "Thu ngân": c.name,
        "Số đơn": c.orderCount,
        "Tổng doanh thu": c.totalRevenue,
        "Tổng giá gốc": c.totalCost,
        "Lợi nhuận": c.totalProfit,
        "Hoa hồng (50%)": c.commission
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HoaHongThuNgan");
      const fileName = `HoaHongThuNgan_${startDate || "TatCa"}_${endDate || "TatCa"}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  useEffect(() => {
    if (activeTab === "withdrawals") {
      fetchWithdrawals();
    } else {
      fetchData();
    }
  }, [startDate, endDate, cashierFilter, activeTab]);

  if (loading) {
    return <div className="loading-spinner" style={{ margin: "40px auto" }} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💰 Thống kê Doanh thu</h1>
          <p className="page-subtitle">Xem báo cáo lợi nhuận và hoa hồng thu ngân</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" onClick={fetchData}>🔄 Tải lại</button>
          <button className="btn btn-primary" onClick={syncCosts}>♻️ Đồng bộ Dữ liệu Lợi Nhuận</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Từ:</span>
        <input
          type="date"
          className="form-input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ width: "auto", minWidth: 0, flex: "1 1 130px", maxWidth: 160 }}
          title="Từ ngày"
        />
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Đến:</span>
        <input
          type="date"
          className="form-input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ width: "auto", minWidth: 0, flex: "1 1 130px", maxWidth: 160 }}
          title="Đến ngày"
        />
        <select 
          className="form-select" 
          value={cashierFilter} 
          onChange={(e) => setCashierFilter(e.target.value)}
          style={{ flex: "1 1 140px", minWidth: 0, maxWidth: 200 }}
        >
          <option value="">Tất cả thu ngân</option>
          {cashiersList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(startDate !== "" || endDate !== "") && (
          <button className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => { setStartDate(""); setEndDate(""); }}>✕ Xóa ngày</button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", maxWidth: "100%", paddingBottom: "4px", scrollbarWidth: "none" }}>
          <button
            className={`btn ${activeTab === "orders" ? "btn-primary" : "btn-secondary"}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setActiveTab("orders"); setOrdersPage(1); }}
          >
            Lợi nhuận Đơn hàng
          </button>
          <button
            className={`btn ${activeTab === "cashiers" ? "btn-primary" : "btn-secondary"}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setActiveTab("cashiers"); setCashiersPage(1); }}
          >
            Hoa hồng Thu ngân
          </button>
          <button
            className={`btn ${activeTab === "withdrawals" ? "btn-primary" : "btn-secondary"}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setActiveTab("withdrawals"); setWithdrawalsPage(1); }}
          >
            Lịch sử Rút tiền
          </button>
        </div>
        
        <div>
          {activeTab === "orders" && (
            <button className="btn btn-secondary" onClick={exportOrdersXLSX} disabled={!data?.orders?.length}>
              📥 Xuất Xuất Excel Đơn Hàng
            </button>
          )}
          {activeTab === "cashiers" && (
            <button className="btn btn-secondary" onClick={exportCashiersXLSX} disabled={!data?.cashiers?.length}>
              📥 Xuất Excel Thu Ngân
            </button>
          )}
        </div>
      </div>

      {activeTab === "orders" && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Thời gian</th>
                  <th>Thu ngân</th>
                  <th style={{ textAlign: "right" }}>Doanh thu</th>
                  <th style={{ textAlign: "right" }}>Tổng giá gốc</th>
                  <th style={{ textAlign: "right" }}>Lợi nhuận</th>
                </tr>
              </thead>
              <tbody>
                {data?.orders?.slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE).map((order) => (
                  <tr key={order.id}>
                    <td><strong>#{order.orderNumber}</strong></td>
                    <td>{new Date(order.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{order.cashier?.name || "Khách lẻ"}</td>
                    <td style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                      {formatCurrency(order.finalAmount)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {formatCurrency(order.totalCost)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--green)", fontWeight: 600 }}>
                      {formatCurrency(order.profit)}
                    </td>
                  </tr>
                ))}
                {(!data?.orders || data.orders.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                      Không có đơn hàng nào hoàn thành.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.orders && data.orders.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "16px" }}>
              <button className="btn btn-secondary btn-sm" disabled={ordersPage === 1} onClick={() => setOrdersPage(p => p - 1)}>Trước</button>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trang {ordersPage} / {Math.ceil(data.orders.length / ITEMS_PER_PAGE)}</div>
              <button className="btn btn-secondary btn-sm" disabled={ordersPage === Math.ceil(data.orders.length / ITEMS_PER_PAGE)} onClick={() => setOrdersPage(p => p + 1)}>Sau</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "cashiers" && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Thu ngân</th>
                  <th style={{ textAlign: "center" }}>Số đơn</th>
                  <th style={{ textAlign: "right" }}>Tổng doanh thu</th>
                  <th style={{ textAlign: "right" }}>Tổng giá gốc</th>
                  <th style={{ textAlign: "right", borderLeft: "2px solid var(--border)" }}>
                    Hoa hồng (50%)
                  </th>
                  <th style={{ textAlign: "right", color: "var(--red)" }}>Đã rút</th>
                  <th style={{ textAlign: "right", color: "var(--green)" }}>Bảng lương (Còn lại)</th>
                  <th style={{ textAlign: "center" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data?.cashiers?.slice((cashiersPage - 1) * ITEMS_PER_PAGE, cashiersPage * ITEMS_PER_PAGE).map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td style={{ textAlign: "center" }}>{c.orderCount}</td>
                    <td style={{ textAlign: "right", color: "var(--accent)" }}>
                      {formatCurrency(c.totalRevenue)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                      {formatCurrency(c.totalCost)}
                    </td>
                    <td style={{ textAlign: "right", backgroundColor: "var(--bg-primary)", color: "var(--text)", fontWeight: 600, borderLeft: "2px solid var(--border)" }}>
                      {formatCurrency(c.commission)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--red)", fontWeight: 500 }}>
                      {formatCurrency(c.withdrawn)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--green)", fontWeight: 700, fontSize: 16 }}>
                      {formatCurrency(c.available)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                         className="btn btn-sm btn-primary" 
                         disabled={c.available <= 0}
                         onClick={() => setWithdrawingCashier(c)}
                      >
                         💸 Rút tiền
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.cashiers || data.cashiers.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                      Chưa có dữ liệu thống kê.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data?.cashiers && data.cashiers.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "16px" }}>
              <button className="btn btn-secondary btn-sm" disabled={cashiersPage === 1} onClick={() => setCashiersPage(p => p - 1)}>Trước</button>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trang {cashiersPage} / {Math.ceil(data.cashiers.length / ITEMS_PER_PAGE)}</div>
              <button className="btn btn-secondary btn-sm" disabled={cashiersPage === Math.ceil(data.cashiers.length / ITEMS_PER_PAGE)} onClick={() => setCashiersPage(p => p + 1)}>Sau</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "withdrawals" && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian rút</th>
                  <th>Thu ngân</th>
                  <th style={{ textAlign: "right" }}>Số tiền rút</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {loadingWithdrawals ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 20 }}>Đang tải...</td></tr>
                ) : withdrawHistory.length === 0 ? (
                   <tr><td colSpan={4} style={{ textAlign: "center", padding: 20 }}>Chưa có lịch sử rút hoa hồng nào.</td></tr>
                ) : (
                  withdrawHistory.slice((withdrawalsPage - 1) * ITEMS_PER_PAGE, withdrawalsPage * ITEMS_PER_PAGE).map((w) => (
                    <tr key={w.id}>
                      <td>{new Date(w.createdAt).toLocaleString("vi-VN")}</td>
                      <td><strong>{w.user?.name || "Khách lẻ"}</strong></td>
                      <td style={{ textAlign: "right", color: "var(--red)", fontWeight: 700 }}>
                        -{formatCurrency(w.amount)}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{w.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {withdrawHistory.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "16px" }}>
              <button className="btn btn-secondary btn-sm" disabled={withdrawalsPage === 1} onClick={() => setWithdrawalsPage(p => p - 1)}>Trước</button>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trang {withdrawalsPage} / {Math.ceil(withdrawHistory.length / ITEMS_PER_PAGE)}</div>
              <button className="btn btn-secondary btn-sm" disabled={withdrawalsPage === Math.ceil(withdrawHistory.length / ITEMS_PER_PAGE)} onClick={() => setWithdrawalsPage(p => p + 1)}>Sau</button>
            </div>
          )}
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawingCashier && (
        <div className="modal-overlay" onClick={() => !submittingWithdraw && setWithdrawingCashier(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
             <div className="modal-header">
              <h2 className="modal-title">💸 Rút Hoa Hồng</h2>
              <button className="modal-close" onClick={() => !submittingWithdraw && setWithdrawingCashier(null)}>✕</button>
            </div>
            <form onSubmit={handleWithdraw} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8 }}>
                 <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Thu ngân</div>
                 <div style={{ fontSize: 16, fontWeight: 600 }}>{withdrawingCashier.name}</div>
                 <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>Hoa hồng có thể rút</div>
                 <div style={{ fontSize: 24, fontWeight: 700, color: "var(--green)" }}>{formatCurrency(withdrawingCashier.available)}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Nhập số tiền cần rút *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ví dụ: 500000" 
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  min="1"
                  max={withdrawingCashier.available}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ background: "var(--red)" }} disabled={submittingWithdraw}>Xác nhận Rút tiền</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
