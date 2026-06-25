"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function SongRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/song-requests");
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: string, rejectReason?: string) => {
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectReason })
      });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi cập nhật trạng thái");
    }
    setProcessingId(null);
  };

  const handleReject = (id: string) => {
    const reason = window.prompt("Vui lòng nhập lý do từ chối (ví dụ: Không thuộc bài, Hết giờ...):");
    if (reason === null) return; // Cancel
    updateStatus(id, "REJECTED", reason);
  };

  const submitTip = async (id: string) => {
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isTipReceived: true,
          tipSenderAccount: "Xác nhận nhanh",
          tipReceivedAt: new Date().toISOString()
        })
      });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi ghi nhận tip");
    }
    setProcessingId(null);
  };

  if (loading) return <div style={{ padding: 24 }}>⏳ Đang tải dữ liệu...</div>;

  const totalPages = Math.ceil(requests.length / itemsPerPage) || 1;
  const currentRequests = requests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>🎵 Yêu cầu bài hát từ khách hàng</h1>
        <button className="btn btn-secondary" onClick={fetchRequests}>🔄 Làm mới</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
            Chưa có yêu cầu bài hát nào
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 60, textAlign: "center" }}>STT</th>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: "20%" }}>Khách hàng</th>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600 }}>Nội dung yêu cầu</th>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: "15%" }}>Tiền Tip</th>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 140, textAlign: "center" }}>Trạng thái</th>
                  <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 220, textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentRequests.map((req, index) => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0", background: req.status === "PENDING" ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#1e293b" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>👤 {req.requesterName || "Khách ẩn danh"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(req.createdAt).toLocaleString("vi-VN")}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 15, marginBottom: 4 }}>🎵 {req.songName || "Không chỉ định bài hát"}</div>
                      {req.message && (
                        <div style={{ fontStyle: "italic", color: "#475569", fontSize: 13, background: "#f1f5f9", padding: "6px 10px", borderRadius: 6 }}>"{req.message}"</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {req.hasTip ? (
                        <div>
                          <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 15, marginBottom: 6 }}>
                            {req.tipAmount ? formatCurrency(req.tipAmount) : "Mức khác"}
                          </div>
                          {req.isTipReceived ? (
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>✅ Đã nhận tiền</div>
                          ) : (
                            <button 
                              className="btn" 
                              style={{ padding: "6px 10px", fontSize: 12, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", borderRadius: 6, fontWeight: 600 }}
                              onClick={() => submitTip(req.id)}
                              disabled={processingId === req.id}
                            >
                              {processingId === req.id ? "⏳..." : "💰 Ghi nhận đã nhận"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>Không có</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ 
                        padding: "6px 12px", 
                        borderRadius: 20, 
                        fontSize: 12, 
                        fontWeight: 700,
                        background: req.status === "PENDING" ? "rgba(245,158,11,0.1)" : req.status === "ACCEPTED" ? "rgba(16,185,129,0.1)" : req.status === "COMPLETED" ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
                        color: req.status === "PENDING" ? "#f59e0b" : req.status === "ACCEPTED" ? "#10b981" : req.status === "COMPLETED" ? "#3b82f6" : "#ef4444",
                        whiteSpace: "nowrap"
                      }}>
                        {req.status === "PENDING" ? "Đang chờ" : req.status === "ACCEPTED" ? "Đã đồng ý" : req.status === "COMPLETED" ? "Đã diễn" : "Từ chối"}
                      </span>
                      {req.status === "REJECTED" && req.rejectReason && (
                        <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontStyle: "italic" }}>{req.rejectReason}</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {req.status === "PENDING" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button 
                            className="btn" 
                            style={{ background: "#10b981", color: "#fff", padding: "6px 10px", fontSize: 12, minWidth: 0, flex: 1 }}
                            onClick={() => updateStatus(req.id, "ACCEPTED")}
                            disabled={processingId === req.id}
                          >
                            ✓ Đồng ý
                          </button>
                          <button 
                            className="btn" 
                            style={{ background: "#ef4444", color: "#fff", padding: "6px 10px", fontSize: 12, minWidth: 0, flex: 1 }}
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      )}
                      {req.status === "ACCEPTED" && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "6px 16px", fontSize: 12, background: "#3b82f6", borderColor: "#3b82f6", width: "100%" }}
                          onClick={() => updateStatus(req.id, "COMPLETED")}
                          disabled={processingId === req.id}
                        >
                          Hoàn thành
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: 16, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: currentPage === 1 ? "#f1f5f9" : "#fff", color: currentPage === 1 ? "#94a3b8" : "#334155", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
            >
              Trước
            </button>
            <span style={{ fontSize: 14, color: "#475569", fontWeight: 500 }}>Trang {currentPage} / {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: currentPage === totalPages ? "#f1f5f9" : "#fff", color: currentPage === totalPages ? "#94a3b8" : "#334155", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
