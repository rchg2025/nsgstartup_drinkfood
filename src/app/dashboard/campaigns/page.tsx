"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedCampaignName, setSelectedCampaignName] = useState("");
  const [selectedCampaignEndDate, setSelectedCampaignEndDate] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bannerImage: "",
    rewardType: "GIFT",
    giftName: "",
    giftImage: "",
    discountType: "FIXED_AMOUNT",
    discountValue: "",
    pointsRequired: "",
    startDate: "",
    endDate: "",
    maxQuantity: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) setCampaigns(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/campaigns/${editId}` : "/api/campaigns";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert(editId ? "Cập nhật chiến dịch thành công!" : "Tạo chiến dịch thành công!");
        setShowModal(false);
        setEditId(null);
        fetchCampaigns();
      } else {
        alert("Lỗi khi xử lý chiến dịch");
      }
    } catch (e) {
      alert("Lỗi kết nối");
    }
  };

  const openCreateModal = () => {
    setEditId(null);
    setFormData({
      name: "", bannerImage: "", rewardType: "GIFT",
      giftName: "", giftImage: "", discountType: "FIXED_AMOUNT", discountValue: "",
      pointsRequired: "", startDate: "", endDate: "", maxQuantity: ""
    });
    setShowModal(true);
  };

  const openEditModal = (camp: any) => {
    setEditId(camp.id);
    const formatDate = (dateString: string) => {
      const d = new Date(dateString);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    
    setFormData({
      name: camp.name || "",
      bannerImage: camp.bannerImage || "",
      rewardType: camp.rewardType || "GIFT",
      giftName: camp.giftName || "",
      giftImage: camp.giftImage || "",
      discountType: camp.discountType || "FIXED_AMOUNT",
      discountValue: camp.discountValue || "",
      pointsRequired: camp.pointsRequired || "",
      startDate: camp.startDate ? formatDate(camp.startDate) : "",
      endDate: camp.endDate ? formatDate(camp.endDate) : "",
      maxQuantity: camp.maxQuantity || "",
    });
    setShowModal(true);
  };

  const openHistoryModal = async (camp: any) => {
    setSelectedCampaignName(camp.name);
    setSelectedCampaignEndDate(camp.endDate);
    setHistoryData([]);
    setHistoryPage(1);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/campaigns/${camp.id}/history`);
      if (res.ok) setHistoryData(await res.json());
    } catch {}
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (res.ok) fetchCampaigns();
    } catch {}
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xoá chiến dịch này? Các mã đã đổi vẫn dùng được nhưng chiến dịch sẽ biến mất.")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) fetchCampaigns();
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📢 Quản lý Chiến dịch</h1>
          <p className="page-subtitle">Tạo chiến dịch cho phép khách sử dụng điểm đổi quà hoặc mã giảm giá</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Tạo chiến dịch mới
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: "40px auto" }} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên chiến dịch</th>
                  <th>Loại quà</th>
                  <th>Phần thưởng</th>
                  <th style={{ textAlign: "center" }}>Trị giá điểm</th>
                  <th style={{ textAlign: "center" }}>Số lượng</th>
                  <th>Thời gian áp dụng</th>
                  <th style={{ textAlign: "center" }}>Trạng thái</th>
                  <th style={{ textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>
                      {c.rewardType === "GIFT" ? (
                        <span style={{ color: "var(--accent)" }}>🎁 Hiện vật</span>
                      ) : (
                        <span style={{ color: "var(--green)" }}>🎟️ Mã giảm giá</span>
                      )}
                    </td>
                    <td>
                      {c.rewardType === "GIFT" 
                        ? c.giftName 
                        : (c.discountType === "FIXED_AMOUNT" 
                            ? `Giảm trực tiếp ${formatCurrency(c.discountValue)}` 
                            : `Giảm ${c.discountValue}%`)}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--accent)" }}>
                      {c.pointsRequired} điểm
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {c.maxQuantity ? `${c.usedQuantity} / ${c.maxQuantity}` : "Không giới hạn"}
                    </td>
                    <td>
                      {new Date(c.startDate).toLocaleDateString("vi-VN")} - {new Date(c.endDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <label style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={() => toggleActive(c.id, c.active)}
                          style={{ accentColor: "var(--green)", width: 18, height: 18 }}
                        />
                      </label>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openHistoryModal(c)}>
                          Lịch sử
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(c)} style={{ color: "var(--purple)" }}>
                          Sửa
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => deleteCampaign(c.id)} style={{ color: "var(--red)" }}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                      Chưa có chiến dịch nào được tạo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {campaigns.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Trang {currentPage} / {Math.ceil(campaigns.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === Math.ceil(campaigns.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(campaigns.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editId ? "Sửa Chiến Dịch" : "Tạo Chiến Dịch Đổi Điểm"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Tên chiến dịch *</label>
                <input required type="text" className="form-input" placeholder="Ví dụ: Giáng sinh an lành - Đổi trà chanh" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Link Ảnh Banner ngoài trang chủ</label>
                <input type="text" className="form-input" placeholder="https://..." value={formData.bannerImage} onChange={(e) => setFormData({...formData, bannerImage: e.target.value})} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                 <div className="form-group">
                    <label className="form-label">Ngày bắt đầu *</label>
                    <input required type="datetime-local" className="form-input" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                 </div>
                 <div className="form-group">
                    <label className="form-label">Ngày kết thúc *</label>
                    <input required type="datetime-local" className="form-input" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                 </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Trị giá điểm cần quy đổi *</label>
                  <input required type="number" min="1" className="form-input" placeholder="Ví dụ: 100" value={formData.pointsRequired} onChange={(e) => setFormData({...formData, pointsRequired: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số lượng giới hạn (Để trống nếu KGH)</label>
                  <input type="number" min="1" className="form-input" placeholder="Ví dụ: 50" value={formData.maxQuantity} onChange={(e) => setFormData({...formData, maxQuantity: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mục đích chiến dịch</label>
                <select className="form-select" value={formData.rewardType} onChange={(e) => setFormData({...formData, rewardType: e.target.value})}>
                  <option value="GIFT">🎁 Đổi Quà Hiện Vật</option>
                  <option value="DISCOUNT">🎟️ Đổi Mã Giảm Giá</option>
                </select>
              </div>

              {formData.rewardType === "GIFT" && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tên phần quà *</label>
                    <input required type="text" className="form-input" placeholder="Ví dụ: Ly Sứ Giáng Sinh" value={formData.giftName} onChange={(e) => setFormData({...formData, giftName: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Link ẢNh phần quà</label>
                    <input type="text" className="form-input" value={formData.giftImage} onChange={(e) => setFormData({...formData, giftImage: e.target.value})} />
                  </div>
                </div>
              )}

              {formData.rewardType === "DISCOUNT" && (
                <div style={{ background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kiểu giảm giá</label>
                    <select className="form-select" value={formData.discountType} onChange={(e) => setFormData({...formData, discountType: e.target.value})}>
                      <option value="FIXED_AMOUNT">Giảm số tiền cụ thể</option>
                      <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Hạn mức giảm *</label>
                    <input required type="number" min="1" className="form-input" placeholder={formData.discountType === "FIXED_AMOUNT" ? "Nhập số tiền (VD: 20000)" : "Nhập số % (VD: 20)"} value={formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} />
                  </div>
                </div>
              )}
              
              <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>{editId ? "Cập nhật" : "💾 Lưu Chiến dịch"}</button>
            </form>
          </div>
        </div>
      )}
      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Lịch sử đổi quà: {selectedCampaignName}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: 20 }}>
              {historyData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
                  Chưa có ai đổi quà từ chiến dịch này.
                </div>
              ) : (
                <>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th style={{ textAlign: "center" }}>Số điện thoại</th>
                        <th style={{ textAlign: "center" }}>Mã Token / Giảm giá</th>
                        <th style={{ textAlign: "center" }}>Điểm tiêu tốn</th>
                        <th style={{ textAlign: "center" }}>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE).map((h) => (
                        <tr key={h.id}>
                          <td><strong>{h.customer?.name || "Khách Vô Danh"}</strong></td>
                          <td style={{ textAlign: "center" }}>{h.customer?.phone}</td>
                          <td style={{ textAlign: "center", color: "var(--green)", fontWeight: 700 }}>
                            <div>{h.discountCode || "QUÀ HIỆN VẬT"}</div>
                            {h.discountCode && (
                              <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: h.isUsed ? "var(--text-muted)" : (selectedCampaignEndDate && new Date() > new Date(new Date(selectedCampaignEndDate).getTime() + 15 * 24 * 60 * 60 * 1000) ? "var(--red)" : "var(--accent)") }}>
                                {h.isUsed ? "Đã dùng" : (selectedCampaignEndDate && new Date() > new Date(new Date(selectedCampaignEndDate).getTime() + 15 * 24 * 60 * 60 * 1000) ? "Vô hiệu hóa" : "Chưa dùng")}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "center", color: "var(--red)" }}>-{h.pointsUsed} điểm</td>
                          <td style={{ textAlign: "center" }}>
                            {new Date(h.createdAt).toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {historyData.length > ITEMS_PER_PAGE && (
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    >
                      Trước
                    </button>
                    <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                      <span>Trang {historyPage} / {Math.ceil(historyData.length / ITEMS_PER_PAGE)}</span>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      disabled={historyPage === Math.ceil(historyData.length / ITEMS_PER_PAGE)}
                      onClick={() => setHistoryPage(p => Math.min(Math.ceil(historyData.length / ITEMS_PER_PAGE), p + 1))}
                    >
                      Sau
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
