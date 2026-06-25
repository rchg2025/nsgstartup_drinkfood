"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function ConfirmedTipsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchConfirmedTips = async () => {
    try {
      const res = await fetch("/api/song-requests");
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", marginBottom: 8 }}>💰 Quản lý Tiền Tip</h1>
        <p style={{ color: "#64748b" }}>Thống kê và quản lý các khoản tiền bồi dưỡng từ khách hàng.</p>
      </div>

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
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Tài khoản gửi</th>
                <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Không có dữ liệu phù hợp với bộ lọc</td>
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
