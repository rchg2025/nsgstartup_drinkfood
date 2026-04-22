"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PointsPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "history">("customers");

  // Customers Tab State
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersPage, setCustomersPage] = useState(1);

  // History Tab State
  const [logs, setLogs] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Redeem State
  const [redeemingCustomer, setRedeemingCustomer] = useState<any>(null);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit Customer State
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    let url = "/api/customers";
    if (customerSearch) url += `?q=${customerSearch}`;
    try {
      const res = await fetch(url);
      setCustomers(await res.json());
    } catch {}
    setLoadingCustomers(false);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    let url = "/api/point-logs?action=REDEEM";
    if (historySearch) url += `&q=${historySearch}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    try {
      const res = await fetch(url);
      setLogs(await res.json());
    } catch {}
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "history") fetchLogs();
  }, [activeTab, customerSearch, historySearch, startDate, endDate]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(redeemAmount);
    if (isNaN(amount) || amount <= 0) return alert("Số điểm không hợp lệ");
    if (amount > redeemingCustomer.currentPoints) {
      return alert("Điểm đổi không được vượt quá số dư hiện tại!");
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${redeemingCustomer.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsToRedeem: amount }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Đổi điểm thành công!");
        setRedeemingCustomer(null);
        setRedeemAmount("");
        fetchCustomers();
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch {
      alert("Lỗi kết nối");
    }
    setSubmitting(false);
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, active: editActive })
      });
      if (res.ok) {
        alert("Cập nhật thông tin thành công!");
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        const data = await res.json();
        alert("Lỗi: " + data.error);
      }
    } catch {
      alert("Lỗi kết nối");
    }
    setSavingEdit(false);
  };

  const handleDeleteCustomer = async (customer: any) => {
    if (customer.currentPoints > 0) {
      const confirmDelete = window.confirm(`Cảnh báo: Khách hàng này đang còn ${formatCurrency(customer.currentPoints).replace("₫", "")} ĐIỂM. Nếu xóa, điểm này sẽ vĩnh viễn mất đi.\n\nBạn có chắc chắn muốn xóa không?`);
      if (!confirmDelete) return;
    } else {
      const confirmDelete = window.confirm("Bạn có chắc chắn muốn xóa khách hàng này không?");
      if (!confirmDelete) return;
    }

    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Xóa thành công!");
        fetchCustomers();
      } else {
        const data = await res.json();
        alert("Lỗi xóa: " + data.error);
      }
    } catch {
      alert("Lỗi kết nối khi xóa");
    }
  };

  const exportCustomersXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportData = customers.map((c) => ({
        "Tên khách hàng": c.name || "—",
        "Số điện thoại": c.phone,
        "Tổng điểm lũy kế": c.totalPoints,
        "Điểm đã đổi": c.redeemedPoints,
        "Số dư điểm": c.currentPoints,
        "Ngày tham gia": new Date(c.createdAt).toLocaleString("vi-VN")
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DanhSachKhachHang");
      XLSX.writeFile(wb, "DanhSachTichDiem.xlsx");
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  const exportHistoryXLSX = async () => {
    try {
      const XLSX = await import("xlsx");
      const exportData = logs.map((l) => ({
        "Thời gian": new Date(l.createdAt).toLocaleString("vi-VN"),
        "Khách hàng": l.customer?.name || "—",
        "Số điện thoại": l.customer?.phone || "—",
        "Hành động": "Đổi điểm",
        "Số điểm trừ": l.points,
        "Ghi chú": l.note
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LichSuDoiDiem");
      XLSX.writeFile(wb, `LichSuDoiDiem_${startDate || "TatCa"}_${endDate || "TatCa"}.xlsx`);
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🎁 Tích Điểm Khách Hàng</h1>
          <p className="page-subtitle">Quản lý quỹ điểm và đổi quà cho thành viên</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", maxWidth: "100%", paddingBottom: "4px", scrollbarWidth: "none" }}>
          <button
            className={`btn ${activeTab === "customers" ? "btn-primary" : "btn-secondary"}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setActiveTab("customers"); setCustomersPage(1); }}
          >
            Danh sách Khách hàng
          </button>
          <button
            className={`btn ${activeTab === "history" ? "btn-primary" : "btn-secondary"}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setActiveTab("history"); setLogsPage(1); }}
          >
            Lịch sử Đổi điểm
          </button>
        </div>

        <div>
           {activeTab === "customers" && (
            <button className="btn btn-secondary" onClick={exportCustomersXLSX} disabled={!customers.length}>
              📥 Xuất Excel Danh Sách
            </button>
          )}
          {activeTab === "history" && (
            <button className="btn btn-secondary" onClick={exportHistoryXLSX} disabled={!logs.length}>
              📥 Xuất Excel Lịch Sử
            </button>
          )}
        </div>
      </div>

      {activeTab === "customers" && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Tìm theo Tên hoặc Số điện thoại..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên Khách Hàng</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Tổng điểm (Đã tích)</th>
                  <th style={{ textAlign: "right", color: "var(--red)" }}>Đã đổi</th>
                  <th style={{ textAlign: "right", color: "var(--green)" }}>Điểm còn lại</th>
                  <th style={{ textAlign: "center" }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loadingCustomers ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>Đang tải...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>Không tìm thấy khách hàng nào.</td></tr>
                ) : (
                  customers.slice((customersPage - 1) * ITEMS_PER_PAGE, customersPage * ITEMS_PER_PAGE).map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name || "Khách hàng"}</strong></td>
                      <td>{c.phone}</td>
                      <td>
                        {c.active ? (
                          <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--green)", padding: "4px 8px", borderRadius: "12px", fontSize: 12, fontWeight: 600 }}>Hoạt động</span>
                        ) : (
                          <span style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--red)", padding: "4px 8px", borderRadius: "12px", fontSize: 12, fontWeight: 600 }}>Đã khóa</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{formatCurrency(c.totalPoints).replace("₫", "")}</td>
                      <td style={{ textAlign: "right", color: "var(--red)", fontWeight: 500 }}>{formatCurrency(c.redeemedPoints).replace("₫", "")}</td>
                      <td style={{ textAlign: "right", color: "var(--green)", fontWeight: 700, fontSize: 16 }}>{formatCurrency(c.currentPoints).replace("₫", "")}</td>
                      <td style={{ textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button 
                          className="btn btn-sm" 
                          style={{ background: "var(--purple)", color: "white" }}
                          disabled={c.currentPoints <= 0 || !c.active}
                          onClick={() => setRedeemingCustomer(c)}
                        >
                          🛠️ Đổi điểm
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          onClick={() => {
                            setEditingCustomer(c);
                            setEditName(c.name || "");
                            setEditActive(c.active);
                          }}
                        >
                          ✏️ Sửa
                        </button>
                        <button 
                          className="btn btn-sm" 
                          style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                          onClick={() => handleDeleteCustomer(c)}
                        >
                          🗑️ Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {customers.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={customersPage === 1}
                onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Trang {customersPage} / {Math.ceil(customers.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={customersPage === Math.ceil(customers.length / ITEMS_PER_PAGE)}
                onClick={() => setCustomersPage(p => Math.min(Math.ceil(customers.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="card" style={{ padding: 0 }}>
           <div style={{ display: "flex", gap: "10px", padding: "16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Tìm theo Tên hoặc Số điện thoại..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ maxWidth: 300 }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 10 }}>Từ:</span>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "auto" }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Đến:</span>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: "auto" }}
              />
              {(startDate !== "" || endDate !== "" || historySearch !== "") && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(""); setEndDate(""); setHistorySearch(""); }}>Xóa lọc</button>
              )}
            </div>
            
            <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th style={{ textAlign: "right" }}>Số điểm đổi</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Đang tải...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>Chưa có lịch sử đổi điểm.</td></tr>
                ) : (
                  logs.slice((logsPage - 1) * ITEMS_PER_PAGE, logsPage * ITEMS_PER_PAGE).map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.createdAt).toLocaleString("vi-VN")}</td>
                      <td><strong>{l.customer?.name || "Khách hàng"}</strong></td>
                      <td>{l.customer?.phone}</td>
                      <td style={{ textAlign: "right", color: "var(--red)", fontWeight: 700 }}>
                        -{formatCurrency(l.points).replace("₫", "")}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{l.note}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {logs.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={logsPage === 1}
                onClick={() => setLogsPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Trang {logsPage} / {Math.ceil(logs.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={logsPage === Math.ceil(logs.length / ITEMS_PER_PAGE)}
                onClick={() => setLogsPage(p => Math.min(Math.ceil(logs.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Redeem Modal */}
      {redeemingCustomer && (
        <div className="modal-overlay" onClick={() => !submitting && setRedeemingCustomer(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
             <div className="modal-header">
              <h2 className="modal-title">🛠️ Đổi Quà / Khấu Trừ Điểm</h2>
              <button className="modal-close" onClick={() => !submitting && setRedeemingCustomer(null)}>✕</button>
            </div>
            <form onSubmit={handleRedeem} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8 }}>
                 <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Khách hàng</div>
                 <div style={{ fontSize: 16, fontWeight: 600 }}>{redeemingCustomer.name || "Khách vãng lai"} - {redeemingCustomer.phone}</div>
                 <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8 }}>Số dư điểm hiện tại</div>
                 <div style={{ fontSize: 24, fontWeight: 700, color: "var(--green)" }}>{formatCurrency(redeemingCustomer.currentPoints).replace("₫", "")} ĐIỂM</div>
              </div>
              <div className="form-group">
                <label className="form-label">Nhập số điểm cần đổi *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="Ví dụ: 50000" 
                  value={redeemAmount}
                  onChange={e => setRedeemAmount(e.target.value)}
                  min="1"
                  max={redeemingCustomer.currentPoints}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>Xác nhận & Trừ điểm</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => !savingEdit && setEditingCustomer(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
             <div className="modal-header">
              <h2 className="modal-title">✏️ Chỉnh Sửa Thông Tin</h2>
              <button className="modal-close" onClick={() => !savingEdit && setEditingCustomer(null)}>✕</button>
            </div>
            <form onSubmit={handleEditCustomer} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input type="text" className="form-input" value={editingCustomer.phone} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Tên khách hàng</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nhập tên khách hàng" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Trạng thái hoạt động</label>
                <div 
                  onClick={() => setEditActive(!editActive)}
                  style={{ 
                    width: 50, height: 26, borderRadius: 13, cursor: "pointer", position: "relative",
                    background: editActive ? "var(--green)" : "rgba(255,255,255,0.1)",
                    transition: "all 0.3s"
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "white",
                    position: "absolute", top: 2, left: editActive ? 26 : 2,
                    transition: "all 0.3s"
                  }} />
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Nếu tắt Trạng thái hoạt động, số điện thoại này sẽ không thể tích điểm hay đổi điểm được nữa.
              </p>
              <button type="submit" className="btn btn-primary" style={{ background: "var(--purple)", color: "white" }} disabled={savingEdit}>
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
