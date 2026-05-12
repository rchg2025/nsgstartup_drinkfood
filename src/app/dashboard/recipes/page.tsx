"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import styles from "./recipe.module.css";

export default function RecipePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch("/api/products");
    setProducts(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const openEdit = (product: any) => {
    setEditItem(product);
    setForm({ ...product });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${editItem.id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ ...editItem, recipe: form.recipe }) 
      });
      if (!res.ok) throw new Error();
      await fetchProducts();
      setShowModal(false);
      showToast("✅ Đã cập nhật công thức thành công!");
    } catch {
      showToast("❌ Có lỗi xảy ra!");
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🍹 Quản lý Công thức</h1>
          <p className="page-subtitle">Thêm và cập nhật công thức pha chế cho các món</p>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="🔍 Tìm kiếm món..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: 36 }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>🔍</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Hình ảnh</th>
              <th>Tên món</th>
              <th>Danh mục</th>
              <th>Trạng thái công thức</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product) => (
              <tr key={product.id}>
                <td>
                  <div className={styles.avatarMini}>
                    {product.image ? <img src={product.image} alt={product.name} /> : <span>🧋</span>}
                  </div>
                </td>
                <td><strong>{product.name}</strong></td>
                <td><span className="badge badge-pending">{product.category?.name}</span></td>
                <td>
                  {product.recipe ? (
                    <span className="badge badge-completed">Đã có công thức</span>
                  ) : (
                    <span className="badge badge-cancelled">Chưa có công thức</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(product)}>
                    {product.recipe ? "✏️ Sửa công thức" : "+ Thêm công thức"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Chưa có món nào</div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">Công thức: {editItem?.name}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nội dung công thức pha chế</label>
              <textarea 
                className="form-input" 
                rows={10} 
                value={form.recipe || ""} 
                onChange={(e) => setForm({ ...form, recipe: e.target.value })} 
                placeholder="Nhập công thức pha chế chi tiết (nguyên liệu, định lượng, các bước thực hiện)..." 
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="loading-spinner" /> Đang lưu...</> : "💾 Lưu công thức"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}
