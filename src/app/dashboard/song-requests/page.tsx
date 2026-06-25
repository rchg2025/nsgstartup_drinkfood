"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function SongRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingTipId, setRecordingTipId] = useState<string | null>(null);
  const [tipSenderAccount, setTipSenderAccount] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const updateStatus = async (id: string, status: "ACCEPTED" | "REJECTED" | "COMPLETED") => {
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi cập nhật trạng thái");
    }
    setProcessingId(null);
  };

  const submitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingTipId) return;
    
    setProcessingId(recordingTipId);
    try {
      await fetch(`/api/song-requests/${recordingTipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isTipReceived: true,
          tipSenderAccount: tipSenderAccount,
          tipReceivedAt: new Date().toISOString()
        })
      });
      setRecordingTipId(null);
      setTipSenderAccount("");
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi ghi nhận tip");
    }
    setProcessingId(null);
  };

  if (loading) return <div style={{ padding: 24 }}>⏳ Đang tải dữ liệu...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>🎵 Yêu cầu bài hát từ khách hàng</h1>
        <button className="btn btn-secondary" onClick={fetchRequests}>🔄 Làm mới</button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 12, color: "#64748b" }}>
            Chưa có yêu cầu bài hát nào
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: `4px solid ${req.status === 'ACCEPTED' ? '#10b981' : req.status === 'COMPLETED' ? '#3b82f6' : req.status === 'REJECTED' ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b", marginBottom: 4 }}>
                    {req.songName || "Không chỉ định bài hát"}
                  </div>
                  <div style={{ fontSize: 14, color: "#64748b" }}>
                    👤 {req.requesterName || "Khách ẩn danh"} • 🕒 {new Date(req.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <div>
                  {req.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        className="btn" 
                        style={{ background: "#10b981", color: "#fff", padding: "6px 12px", fontSize: 13 }}
                        onClick={() => updateStatus(req.id, "ACCEPTED")}
                        disabled={processingId === req.id}
                      >
                        ✓ Đồng ý
                      </button>
                      <button 
                        className="btn" 
                        style={{ background: "#ef4444", color: "#fff", padding: "6px 12px", fontSize: 13 }}
                        onClick={() => updateStatus(req.id, "REJECTED")}
                        disabled={processingId === req.id}
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  )}
                  {req.status !== "PENDING" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ 
                        padding: "4px 12px", 
                        borderRadius: 20, 
                        fontSize: 12, 
                        fontWeight: 700,
                        background: req.status === "ACCEPTED" ? "rgba(16,185,129,0.1)" : req.status === "COMPLETED" ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
                        color: req.status === "ACCEPTED" ? "#10b981" : req.status === "COMPLETED" ? "#3b82f6" : "#ef4444"
                      }}>
                        {req.status === "ACCEPTED" ? "Đã đồng ý" : req.status === "COMPLETED" ? "Đã biểu diễn" : "Đã từ chối"}
                      </span>
                      {req.status === "ACCEPTED" && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: "4px 12px", fontSize: 12, background: "#3b82f6", borderColor: "#3b82f6" }}
                          onClick={() => updateStatus(req.id, "COMPLETED")}
                          disabled={processingId === req.id}
                        >
                          Hoàn thành
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, fontSize: 15, color: "#334155", fontStyle: "italic", marginBottom: req.hasTip ? 16 : 0 }}>
                "{req.message}"
              </div>

              {req.hasTip && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #cbd5e1", paddingTop: 16, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Khoản bồi dưỡng (Tip)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>{req.tipAmount ? formatCurrency(req.tipAmount) : "Mức khác"}</div>
                  </div>
                  <div>
                    {req.isTipReceived ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>✅ Đã nhận tiền</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Từ TK: {req.tipSenderAccount || "Không rõ"} • Lúc {new Date(req.tipReceivedAt).toLocaleTimeString("vi-VN")}
                        </div>
                      </div>
                    ) : (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => { setRecordingTipId(req.id); setTipSenderAccount(""); }}
                      >
                        💰 Ghi nhận đã nhận
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {recordingTipId && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setRecordingTipId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Ghi nhận nhận Tiền Tip</h3>
            <p style={{ color: "#64748b", marginBottom: 16, fontSize: 14 }}>
              Vui lòng nhập số tài khoản hoặc tên người gửi (từ biên lai chuyển khoản) để đối soát.
            </p>
            <form onSubmit={submitTip}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Thông tin người gửi / Số tài khoản</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: NGUYEN VAN A 123456789"
                  value={tipSenderAccount}
                  onChange={(e) => setTipSenderAccount(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRecordingTipId(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={processingId === recordingTipId}>Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
