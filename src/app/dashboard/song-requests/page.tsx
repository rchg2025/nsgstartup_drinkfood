"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function SongRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isRequestEnabled, setIsRequestEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "";

  const fetchRequests = async () => {
    try {
      const url = filterDate ? `/api/song-requests?date=${filterDate}` : "/api/song-requests";
      const res = await fetch(url);
      const data = await res.json();
      setRequests(data);
      
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setIsRequestEnabled(settingsData.song_request_enabled !== "false");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [filterDate]);

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

  const toggleRequestEnabled = async () => {
    const newValue = !isRequestEnabled;
    setIsRequestEnabled(newValue);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ song_request_enabled: newValue ? "true" : "false" })
      });
    } catch (e) {
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const confirmReject = (id: string) => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    updateStatus(id, "REJECTED", rejectReason);
    setRejectingId(null);
    setRejectReason("");
  };

  const submitTip = async (id: string) => {
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isTipReceived: true,
          tipSenderAccount: (session?.user as any)?.name || "Band nhạc",
          tipReceivedAt: new Date().toISOString()
        })
      });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi ghi nhận tip");
    }
    setProcessingId(null);
  };

  const handleDeleteAll = async () => {
    if (!confirm("Bạn có CHẮC CHẮN muốn xóa TẤT CẢ yêu cầu bài hát không? Hành động này không thể hoàn tác.")) return;
    try {
      await fetch("/api/song-requests", { method: "DELETE" });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi xóa tất cả");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu bài hát này không?")) return;
    setProcessingId(id);
    try {
      await fetch(`/api/song-requests/${id}`, { method: "DELETE" });
      fetchRequests();
    } catch (e) {
      alert("Lỗi khi xóa");
    }
    setProcessingId(null);
  };

  if (loading) return <div style={{ padding: 24 }}>⏳ Đang tải dữ liệu...</div>;

  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (req.songName && req.songName.toLowerCase().includes(lowerQuery)) ||
      (req.requesterName && req.requesterName.toLowerCase().includes(lowerQuery)) ||
      (req.message && req.message.toLowerCase().includes(lowerQuery))
    );
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const currentRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: 24 }} className="song-requests-page">
      <style>{`
        .filters-container {
          display: flex;
          gap: 12px;
          margin: 16px 0;
          flex-wrap: wrap;
        }
        .search-input, .date-input {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          flex: 1;
          min-width: 200px;
        }
        .search-input:focus, .date-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
        }
        @media (max-width: 768px) {
          .song-requests-page { padding: 12px !important; }
          .hide-on-mobile { display: none; }
          .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td {
            display: block;
            width: 100%;
          }
          .responsive-table thead { display: none; }
          .responsive-table tr {
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
          }
          .responsive-table td {
            text-align: right;
            padding-left: 45% !important;
            position: relative;
            border-bottom: 1px solid #f1f5f9;
            min-height: 48px;
          }
          .responsive-table td::before {
            content: attr(data-label);
            position: absolute;
            left: 16px;
            width: 40%;
            text-align: left;
            font-weight: 600;
            color: #64748b;
            top: 50%;
            transform: translateY(-50%);
          }
          .responsive-table td:last-child { border-bottom: 0; }
          .responsive-table td.full-width-mobile {
            padding-left: 16px !important;
            text-align: left;
          }
          .responsive-table td.full-width-mobile::before { display: none; }
        }
      `}</style>
      <div className="page-header" style={{ flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", margin: 0 }}>🎵 Yêu cầu bài hát</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            className="btn" 
            style={{ background: isRequestEnabled ? "#10b981" : "#ef4444", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, border: "none" }} 
            onClick={toggleRequestEnabled}
          >
            {isRequestEnabled ? "🎙️ Đang Mở Yêu Cầu" : "🚫 Đã Tắt Yêu Cầu"}
          </button>
          {role === "ADMIN" && (
            <button className="btn" style={{ background: "#ef4444", color: "#fff", padding: "8px 16px", borderRadius: 8, fontWeight: 600, border: "none" }} onClick={handleDeleteAll}>
              🗑️ Xóa tất cả
            </button>
          )}
          <button className="btn btn-secondary" onClick={fetchRequests}>🔄 Làm mới</button>
        </div>
      </div>

      <div className="filters-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Tìm tên bài hát, khách hàng, ghi chú..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <input 
          type="date" 
          className="date-input" 
          value={filterDate}
          onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
          title="Chọn ngày"
          style={{ maxWidth: "200px" }}
        />
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
            Chưa có yêu cầu bài hát nào trong ngày này
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
            Không tìm thấy kết quả nào phù hợp
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th className="hide-on-mobile" style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 60, textAlign: "center" }}>STT</th>
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
                    <td data-label="STT" className="hide-on-mobile" style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "#1e293b" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td data-label="Khách hàng" style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>👤 {req.requesterName || "Khách ẩn danh"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{new Date(req.createdAt).toLocaleString("vi-VN")}</div>
                    </td>
                    <td data-label="Nội dung yêu cầu" className="full-width-mobile" style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 15, marginBottom: 4 }}>🎵 {req.songName || "Không chỉ định bài hát"}</div>
                      {req.message && (
                        <div style={{ fontStyle: "italic", color: "#475569", fontSize: 13, background: "#f1f5f9", padding: "6px 10px", borderRadius: 6 }}>"{req.message}"</div>
                      )}
                    </td>
                    <td data-label="Tiền Tip" style={{ padding: "14px 16px" }}>
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
                    <td data-label="Trạng thái" style={{ padding: "14px 16px", textAlign: "center" }}>
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
                    <td data-label="Thao tác" className="full-width-mobile" style={{ padding: "14px 16px", textAlign: "center" }}>
                      {req.status === "PENDING" && (
                        rejectingId === req.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <input 
                              type="text" 
                              placeholder="Lý do từ chối..." 
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" }}
                              autoFocus
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button 
                                className="btn" 
                                style={{ background: "#ef4444", color: "#fff", padding: "6px 8px", fontSize: 12, minWidth: 0, flex: 1, borderRadius: 8 }}
                                onClick={() => confirmReject(req.id)}
                                disabled={processingId === req.id}
                              >
                                Xác nhận
                              </button>
                              <button 
                                className="btn" 
                                style={{ background: "#94a3b8", color: "#fff", padding: "6px 8px", fontSize: 12, minWidth: 0, flex: 1, borderRadius: 8 }}
                                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                disabled={processingId === req.id}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button 
                              className="btn" 
                              style={{ background: "#10b981", color: "#fff", padding: "8px 12px", fontSize: 14, minWidth: 0, flex: 1, borderRadius: 8, border: "none" }}
                              onClick={() => updateStatus(req.id, "ACCEPTED")}
                              disabled={processingId === req.id}
                              title="Đồng ý"
                            >
                              ✓ Đồng ý
                            </button>
                            <button 
                              className="btn" 
                              style={{ background: "#ef4444", color: "#fff", padding: "8px 12px", fontSize: 14, minWidth: 0, flex: 1, borderRadius: 8, border: "none" }}
                              onClick={() => { setRejectingId(req.id); setRejectReason(""); }}
                              disabled={processingId === req.id}
                              title="Từ chối"
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        )
                      )}
                      {role === "ADMIN" && req.status !== "PENDING" && (
                        <button 
                          className="btn" 
                          style={{ padding: "6px 16px", fontSize: 12, background: "#fff", color: "#ef4444", border: "1px solid #ef4444", width: "100%", borderRadius: 8 }}
                          onClick={() => handleDelete(req.id)}
                          disabled={processingId === req.id}
                        >
                          Xóa
                        </button>
                      )}
                      {role === "ADMIN" && (
                        <button 
                          className="btn" 
                          style={{ background: "#fee2e2", color: "#ef4444", padding: "6px 16px", fontSize: 12, border: "none", width: "100%", marginTop: req.status === "REJECTED" || req.status === "COMPLETED" ? 0 : 6 }}
                          onClick={() => handleDelete(req.id)}
                          disabled={processingId === req.id}
                        >
                          🗑️ Xóa
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
