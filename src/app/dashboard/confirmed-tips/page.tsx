"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function ConfirmedTipsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConfirmedTips = async () => {
    try {
      const res = await fetch("/api/song-requests?includeHidden=true");
      const data = await res.json();
      // Filter those with received tips
      const tips = data.filter((req: any) => req.hasTip && req.isTipReceived);
      setRequests(tips);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(ymd);
    setEndDate(ymd);
    fetchConfirmedTips();
  }, []);

  const handleDeleteAllTips = async () => {
    if (!confirm("Bạn có CHẮC CHẮN muốn xóa TẤT CẢ danh sách tiền tip không?")) return;
    try {
      await fetch("/api/song-requests?onlyTips=true", { method: "DELETE" });
      fetchConfirmedTips();
    } catch (e) {
      alert("Lỗi khi xóa tất cả");
    }
  };

  const handleDeleteTip = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lượt Tip này không?")) return;
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}?fromTips=true`, { method: "DELETE" });
      fetchConfirmedTips();
    } catch (e) {
      alert("Lỗi khi xóa");
    }
    setProcessingId(null);
  };

  if (loading) return <div style={{ padding: 24 }}>⏳ Đang tải dữ liệu...</div>;

  const filteredRequests = requests.filter(req => {
    // Date filter
    if (req.tipReceivedAt) {
      const tipDate = new Date(req.tipReceivedAt);
      const tipYmd = `${tipDate.getFullYear()}-${String(tipDate.getMonth() + 1).padStart(2, '0')}-${String(tipDate.getDate()).padStart(2, '0')}`;
      if (startDate && tipYmd < startDate) return false;
      if (endDate && tipYmd > endDate) return false;
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = req.requesterName?.toLowerCase().includes(term);
      const matchSong = req.songName?.toLowerCase().includes(term);
      const matchSender = req.tipSenderAccount?.toLowerCase().includes(term);
      if (!matchName && !matchSong && !matchSender) return false;
    }

    return true;
  });

  const totalTip = filteredRequests.reduce((sum, req) => sum + (req.tipAmount || 0), 0);
  const countTip = filteredRequests.length;

  const handleExportExcel = () => {
    if (filteredRequests.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }
    
    const bom = "\uFEFF";
    const headers = ["STT", "Thời gian nhận", "Khách hàng", "Bài hát", "Người xác nhận", "Số tiền (VNĐ)"];
    const rows = filteredRequests.map((req, index) => [
      index + 1,
      new Date(req.tipReceivedAt).toLocaleString("vi-VN"),
      req.requesterName || "Khách ẩn danh",
      req.songName || "Không chỉ định",
      req.tipSenderAccount || "-",
      req.tipAmount || 0
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DanhSachTip_${startDate}_den_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24, paddingBottom: 60 }}>
      <div className="page-header">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>💵 Quản lý Tiền Tip</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {role === "ADMIN" && (
            <button className="btn" style={{ background: "#ef4444", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, border: "none" }} onClick={handleDeleteAllTips}>
              🗑️ Xóa danh sách
            </button>
          )}
          <button className="btn" style={{ background: "#10b981", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, border: "none" }} onClick={handleExportExcel}>
            📊 Xuất Excel
          </button>
          <button className="btn btn-secondary" onClick={fetchConfirmedTips}>🔄 Làm mới</button>
        </div>
      </div>
      <p style={{ color: "#64748b", marginBottom: 24 }}>Thống kê và quản lý các khoản tiền bồi dưỡng từ khách hàng.</p>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", minWidth: 250 }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Tổng tiền Tip (theo bộ lọc)</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{formatCurrency(totalTip)}</div>
        </div>
        <div style={{ flex: 1, background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)", minWidth: 250 }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Số lượt Tip đã nhận</div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{countTip} lượt</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 24, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 250 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Tìm kiếm thông minh</label>
          <input 
            type="text" 
            placeholder="Tên khách, tên bài hát, tài khoản gửi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Từ ngày</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, cursor: "pointer" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Đến ngày</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, cursor: "pointer" }}
          />
        </div>
        <button 
          onClick={() => { setStartDate(""); setEndDate(""); setSearchTerm(""); }}
          style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
        >
          Xóa bộ lọc
        </button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0", width: 60, textAlign: "center" }}>STT</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Thời gian nhận</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Khách hàng</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Bài hát</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Người xác nhận</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Số tiền</th>
                {role === "ADMIN" && (
                  <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0", textAlign: "center", width: 80 }}>Xóa</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={role === "ADMIN" ? 7 : 6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Không có dữ liệu phù hợp với bộ lọc</td>
                </tr>
              ) : (
                filteredRequests.map((req, index) => (
                  <tr key={req.id} style={{ transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f1f5f9"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#1e293b", fontWeight: 600, textAlign: "center" }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#334155" }}>
                      {new Date(req.tipReceivedAt).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#1e293b", fontWeight: 600 }}>
                      👤 {req.requesterName || "Khách ẩn danh"}
                    </td>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#334155" }}>
                      🎵 {req.songName || "Không chỉ định"}
                    </td>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#64748b" }}>
                      {req.tipSenderAccount || "-"}
                    </td>
                    <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 15, fontWeight: 700, color: "#10b981", textAlign: "right" }}>
                      {formatCurrency(req.tipAmount || 0)}
                    </td>
                    {role === "ADMIN" && (
                      <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                        <button 
                          onClick={() => handleDeleteTip(req.id)}
                          disabled={processingId === req.id}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#ef4444", cursor: processingId === req.id ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 12 }}
                        >
                          {processingId === req.id ? "..." : "🗑️"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
