"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function ConfirmedTipsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchConfirmedTips();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>⏳ Đang tải dữ liệu...</div>;

  const totalTip = requests.reduce((sum, req) => sum + (req.tipAmount || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", marginBottom: 8 }}>💰 Quản lý Tiền Tip</h1>
        <p style={{ color: "#64748b" }}>Danh sách các khoản tiền bồi dưỡng đã được xác nhận thành công.</p>
      </div>

      <div style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", padding: 24, borderRadius: 16, marginBottom: 24, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", display: "inline-block", minWidth: 250 }}>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Tổng tiền Tip đã nhận</div>
        <div style={{ fontSize: 32, fontWeight: 800 }}>{formatCurrency(totalTip)}</div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Thời gian nhận</th>
              <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Khách hàng</th>
              <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Bài hát</th>
              <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0" }}>Tài khoản gửi</th>
              <th style={{ padding: "16px 20px", color: "#475569", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Chưa có khoản tiền tip nào được xác nhận</td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req.id}>
                  <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#334155" }}>
                    {new Date(req.tipReceivedAt).toLocaleString("vi-VN")}
                  </td>
                  <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#1e293b", fontWeight: 500 }}>
                    {req.requesterName || "Khách ẩn danh"}
                  </td>
                  <td style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", fontSize: 14, color: "#334155" }}>
                    {req.songName || "Không chỉ định"}
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
  );
}
