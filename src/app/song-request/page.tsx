"use client";
import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";
import styles from "../page.module.css";

export default function SongRequestPage() {
  const [bankSettings, setBankSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleOrderDrinkClick = async () => {
    const session = await getSession();
    if (session) {
      window.location.href = '/';
    } else {
      window.location.href = '/order';
    }
  };

  const [srMessage, setSrMessage] = useState("");
  const [srSongName, setSrSongName] = useState("");
  const [srRequester, setSrRequester] = useState("");
  const [srHasTip, setSrHasTip] = useState(false);
  const [srTipAmount, setSrTipAmount] = useState<number | "other">(10000);
  const [srOtherTipAmount, setSrOtherTipAmount] = useState<number | "">("");
  const [submittingSr, setSubmittingSr] = useState(false);
  const [srSuccess, setSrSuccess] = useState(false);
  const [srActiveTab, setSrActiveTab] = useState<"create" | "list">("create");
  const [srList, setSrList] = useState<any[]>([]);
  const [srLoading, setSrLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const filteredSrList = srList.filter(req => {
    if (filterStatus !== "ALL" && req.status !== filterStatus) return false;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      const matchSong = req.songName?.toLowerCase().includes(lowerTerm);
      const matchRequester = req.requesterName?.toLowerCase().includes(lowerTerm);
      const matchMessage = req.message?.toLowerCase().includes(lowerTerm);
      return matchSong || matchRequester || matchMessage;
    }
    return true;
  }).sort((a, b) => {
    const statusOrder: Record<string, number> = {
      "ACCEPTED": 1,
      "PENDING": 2,
      "COMPLETED": 3,
      "REJECTED": 4
    };
    const orderA = statusOrder[a.status] || 99;
    const orderB = statusOrder[b.status] || 99;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(filteredSrList.length / itemsPerPage) || 1;
  const currentSrList = filteredSrList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetch("/api/public/menu-data")
      .then(res => res.json())
      .then(data => {
        setBankSettings(data.settings || {});
        setLoading(false);
      });
  }, []);

  const fetchPublicSongRequests = async () => {
    setSrLoading(true);
    try {
      const res = await fetch("/api/public/song-requests");
      const data = await res.json();
      setSrList(data);
    } catch (e) {
      console.error(e);
    }
    setSrLoading(false);
  };

  useEffect(() => {
    if (srActiveTab === "list") {
      fetchPublicSongRequests();
    }
  }, [srActiveTab]);

  const handleSubmitSongRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srMessage.trim()) return alert("Vui lòng nhập cảm nghĩ hoặc câu chuyện của bạn!");
    
    setSubmittingSr(true);
    let finalTipAmount = 0;
    if (srHasTip) {
      if (srTipAmount === "other") {
        finalTipAmount = Number(srOtherTipAmount) || 0;
      } else {
        finalTipAmount = Number(srTipAmount) || 0;
      }
    }

    try {
      const res = await fetch("/api/song-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: srMessage,
          songName: srSongName,
          requesterName: srRequester,
          hasTip: srHasTip,
          tipAmount: finalTipAmount,
        }),
      });
      if (res.ok) {
        setSrSuccess(true);
        setSrMessage("");
        setSrSongName("");
        setSrRequester("");
        setSrHasTip(false);
        setSrTipAmount(10000);
        setSrOtherTipAmount("");
        setTimeout(() => {
          setSrSuccess(false);
        }, 3000);
      } else {
        const data = await res.json();
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
    setSubmittingSr(false);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 50, color: "#64748b" }}>⏳ Đang tải dữ liệu...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: "var(--font-geist-sans)" }}>
      <div className={styles.menuHeader} style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)", position: "sticky", top: 0 }}>
        <div className={styles.brandName} style={{ cursor: "pointer" }} onClick={() => window.location.href = '/'}>
          <div className={styles.brandIcon}>🍹</div>
          <span className={styles.brandNameText}>NSGSTARTUP MENU</span>
        </div>
        <div className={styles.headerActions} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button 
            className={styles.sizeBtn} 
            style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "var(--primary)", border: "1px solid var(--primary)", background: "rgba(239, 68, 68, 0.05)" }}
            onClick={handleOrderDrinkClick}
          >
            🥤 Đặt nước
          </button>
          <button 
            className={styles.sizeBtn} 
            style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "var(--purple)", border: "1px solid var(--purple)", background: "rgba(102, 51, 153, 0.05)" }}
            onClick={() => window.location.href = '/?action=points'}
          >
            🎁 Tra Điểm
          </button>
          <a href="/login" style={{ fontSize: "14px", fontWeight: 600, color: "#8c93a1", textDecoration: "none", display: "flex", alignItems: "center" }} title="Đăng nhập quản trị">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          </a>
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 10px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <div style={{ width: "100%", maxWidth: 1200, background: "#fff", borderRadius: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>🎵 Yêu cầu bài hát</h2>
            <p style={{ color: "#64748b", marginTop: 8 }}>Gửi tặng bài hát và những lời yêu thương</p>
          </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#f1f5f9", padding: 4, borderRadius: 8, flexShrink: 0 }}>
          <button 
            style={{ flex: 1, padding: "10px 0", borderRadius: 6, fontWeight: 600, fontSize: 15, background: srActiveTab === "create" ? "#fff" : "transparent", color: srActiveTab === "create" ? "var(--primary)" : "#64748b", boxShadow: srActiveTab === "create" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => setSrActiveTab("create")}
          >
            Tạo yêu cầu mới
          </button>
          <button 
            style={{ flex: 1, padding: "10px 0", borderRadius: 6, fontWeight: 600, fontSize: 15, background: srActiveTab === "list" ? "#fff" : "transparent", color: srActiveTab === "list" ? "var(--primary)" : "#64748b", boxShadow: srActiveTab === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
            onClick={() => setSrActiveTab("list")}
          >
            Danh sách bài hát
          </button>
        </div>

        {srActiveTab === "list" && (
           <div style={{ flex: 1 }}>
             {srLoading ? (
               <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Đang tải...</div>
             ) : srList.length === 0 ? (
               <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Chưa có bài hát nào được yêu cầu.</div>
             ) : (
               <>
                 <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                   <input 
                     type="text" 
                     placeholder="🔍 Tìm kiếm bài hát, người gửi, lời nhắn..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                   />
                   <select 
                     value={filterStatus}
                     onChange={(e) => setFilterStatus(e.target.value)}
                     style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff", cursor: "pointer", outline: "none" }}
                   >
                     <option value="ALL">Tất cả trạng thái</option>
                     <option value="PENDING">Đang chờ</option>
                     <option value="ACCEPTED">Sắp diễn</option>
                     <option value="COMPLETED">Đã diễn</option>
                     <option value="REJECTED">Từ chối</option>
                   </select>
                 </div>

                 {filteredSrList.length === 0 ? (
                   <div style={{ textAlign: "center", padding: 40, color: "#64748b", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }}>Không tìm thấy yêu cầu phù hợp với bộ lọc.</div>
                 ) : (
                   <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                     <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                       <thead>
                         <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                           <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 60, textAlign: "center" }}>STT</th>
                           <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: "25%" }}>Bài hát</th>
                           <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: "20%" }}>Khách hàng</th>
                           <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600 }}>Cảm nghĩ</th>
                           <th style={{ padding: "14px 16px", color: "#475569", fontWeight: 600, width: 100, textAlign: "center" }}>Trạng thái</th>
                         </tr>
                       </thead>
                       <tbody>
                         {currentSrList.map((req, index) => (
                           <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
                             <td style={{ padding: "14px 16px", color: "#1e293b", fontWeight: 600, textAlign: "center" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                             <td style={{ padding: "14px 16px", color: "#1e293b", fontWeight: 600 }}>{req.songName || "Không rõ"}</td>
                             <td style={{ padding: "14px 16px", color: "#64748b" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                                 👤 {req.requesterName || "Khách ẩn danh"}
                               </div>
                               <div style={{ fontSize: 13, marginTop: 4 }}>{new Date(req.createdAt).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}</div>
                             </td>
                             <td style={{ padding: "14px 16px", color: "#334155", fontStyle: req.message ? "italic" : "normal" }}>
                               {req.message ? `"${req.message}"` : "-"}
                             </td>
                             <td style={{ padding: "14px 16px", textAlign: "center" }}>
                               <span style={{ fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 12, background: req.status === "ACCEPTED" ? "rgba(16,185,129,0.1)" : req.status === "COMPLETED" ? "rgba(59,130,246,0.1)" : req.status === "REJECTED" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: req.status === "ACCEPTED" ? "#10b981" : req.status === "COMPLETED" ? "#3b82f6" : req.status === "REJECTED" ? "#ef4444" : "#f59e0b", whiteSpace: "nowrap" }}>
                                 {req.status === "ACCEPTED" ? "Sắp diễn" : req.status === "COMPLETED" ? "Đã diễn" : req.status === "REJECTED" ? "Từ chối" : "Đang chờ"}
                               </span>
                               {req.status === "REJECTED" && req.rejectReason && (
                                 <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, fontStyle: "italic", maxWidth: 150, margin: "4px auto 0" }}>{req.rejectReason}</div>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
                 {totalPages > 1 && (
                   <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
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
               </>
             )}
           </div>
        )}

        {srActiveTab === "create" && (
          <div style={{ flex: 1 }}>
            {srSuccess ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🎸</div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)", marginBottom: 12 }}>Gửi yêu cầu thành công!</h3>
                <p style={{ color: "#64748b", marginBottom: 8, fontSize: 16 }}>Band nhạc đã nhận được yêu cầu của bạn và sẽ sớm phản hồi.</p>
                <p style={{ color: "#94a3b8", marginBottom: 32, fontSize: 14 }}>Tự động quay lại màn hình tạo yêu cầu sau 3 giây...</p>
                <button 
                  style={{ padding: "14px 24px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: "pointer", width: "100%", maxWidth: 300 }}
                  onClick={() => { setSrSuccess(false); setSrActiveTab("list"); }}
                >
                  Xem danh sách bài hát
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitSongRequest}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#1e293b", fontSize: 15 }}>Chia sẻ cảm nghĩ / Câu chuyện <span style={{color:"red"}}>*</span></label>
                  <textarea
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", minHeight: 100, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }}
                    placeholder="Bạn muốn chia sẻ điều gì?"
                    value={srMessage}
                    onChange={(e) => setSrMessage(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#1e293b", fontSize: 15 }}>Bài hát yêu cầu (Không bắt buộc)</label>
                  <input
                    type="text"
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 15, boxSizing: "border-box" }}
                    placeholder="Tên bài hát / Ca sĩ"
                    value={srSongName}
                    onChange={(e) => setSrSongName(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#1e293b", fontSize: 15 }}>Họ tên người yêu cầu (Không bắt buộc)</label>
                  <input
                    type="text"
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 15, boxSizing: "border-box" }}
                    placeholder="Tên của bạn"
                    value={srRequester}
                    onChange={(e) => setSrRequester(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, cursor: "pointer", color: "#1e293b", fontSize: 15 }}>
                    <input
                      type="checkbox"
                      checked={srHasTip}
                      onChange={(e) => setSrHasTip(e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: "var(--primary)" }}
                    />
                    Bồi dưỡng cho Band nhạc (Tip)
                  </label>
                </div>

                {srHasTip && (
                  <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, marginBottom: 24, border: "1px solid #e2e8f0" }}>
                    <label style={{ display: "block", marginBottom: 12, fontWeight: 600, color: "#1e293b", fontSize: 15 }}>Chọn mức tiền tip</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                      {[5000, 10000, 20000, 50000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setSrTipAmount(amount)}
                          style={{
                            padding: "10px 16px",
                            borderRadius: 24,
                            border: `2px solid ${srTipAmount === amount ? "var(--primary)" : "#cbd5e1"}`,
                            background: srTipAmount === amount ? "rgba(239, 68, 68, 0.1)" : "#fff",
                            color: srTipAmount === amount ? "var(--primary)" : "#475569",
                            fontWeight: 600,
                            fontSize: 15,
                            cursor: "pointer"
                          }}
                        >
                          {formatCurrency(amount)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSrTipAmount("other")}
                        style={{
                          padding: "10px 16px",
                          borderRadius: 24,
                          border: `2px solid ${srTipAmount === "other" ? "var(--primary)" : "#cbd5e1"}`,
                          background: srTipAmount === "other" ? "rgba(239, 68, 68, 0.1)" : "#fff",
                          color: srTipAmount === "other" ? "var(--primary)" : "#475569",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer"
                        }}
                      >
                        Khác
                      </button>
                    </div>
                    {srTipAmount === "other" && (
                      <input
                        type="number"
                        style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 15, boxSizing: "border-box", marginBottom: 16 }}
                        placeholder="Nhập số tiền khác..."
                        value={srOtherTipAmount}
                        onChange={(e) => setSrOtherTipAmount(Number(e.target.value))}
                      />
                    )}

                    {bankSettings?.band_bank_code && bankSettings?.band_bank_account && (
                      <div style={{ textAlign: "center", marginTop: 20, borderTop: "1px dashed #cbd5e1", paddingTop: 20 }}>
                        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>Quét mã QR để chuyển tiền cho Band</p>
                        <div style={{ background: "white", padding: 16, borderRadius: 16, display: "inline-block", border: "1px solid #e2e8f0", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
                          <img 
                            src={`https://img.vietqr.io/image/${bankSettings.band_bank_code}-${bankSettings.band_bank_account}-compact2.png?amount=${srTipAmount === "other" ? srOtherTipAmount : srTipAmount}&addInfo=Tip cho Band ${srRequester}`}
                            alt="QR Code Band"
                            style={{ width: 220, height: 220, objectFit: "contain" }}
                          />
                        </div>
                        <div style={{ fontWeight: 800, color: "#1e293b", marginTop: 16, fontSize: 16 }}>{bankSettings.band_bank_account_name}</div>
                        <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 16 }}>{bankSettings.band_bank_account} - {bankSettings.band_bank_code}</div>
                        
                        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                          <button 
                            type="button"
                            onClick={async () => {
                              const url = `https://img.vietqr.io/image/${bankSettings.band_bank_code}-${bankSettings.band_bank_account}-compact2.png?amount=${srTipAmount === "other" ? srOtherTipAmount : srTipAmount}&addInfo=Tip cho Band ${srRequester}`;
                              try {
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const blobUrl = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = blobUrl;
                                a.download = "QR_Tip_Band.png";
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(blobUrl);
                                document.body.removeChild(a);
                              } catch (e) {
                                console.error("Lỗi khi tải ảnh, mở sang tab mới", e);
                                window.open(url, "_blank");
                              }
                            }}
                            style={{ padding: "12px 20px", borderRadius: 10, background: "#f8fafc", color: "#334155", fontWeight: 700, fontSize: 15, border: "1px solid #cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}
                          >
                            ⬇️ Tải mã QR về máy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 32 }}>
                  <button 
                    type="submit" 
                    style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)" }} 
                    disabled={submittingSr}
                  >
                    {submittingSr ? "⏳ Đang gửi yêu cầu..." : "✨ Gửi yêu cầu ngay"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
