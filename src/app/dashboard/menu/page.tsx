"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import styles from "./menu.module.css";

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "toppings">("products");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchAll = async () => {
    setLoading(true);
    const [catRes, prodRes, topRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/products"),
      fetch("/api/toppings"),
    ]);
    setCategories(await catRes.json());
    setProducts(await prodRes.json());
    setToppings(await topRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const openCreate = () => {
    setEditItem(null);
    if (activeTab === "products") {
      setForm({ name: "", price: "", costPrice: "", categoryId: categories[0]?.id || "", description: "", image: "", available: true, sizes: [{ name: "M", priceAdd: 0 }] });
    } else if (activeTab === "categories") {
      setForm({ name: "", icon: "🍹", sortOrder: 0, active: true });
    } else {
      setForm({ name: "", price: 0, available: true });
    }
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (activeTab === "products") {
      setForm({ ...item, price: item.price, costPrice: item.costPrice || 0, categoryId: item.categoryId, sizes: item.sizes || [] });
    } else {
      setForm({ ...item });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isEdit = !!editItem;
      let url = "";
      let method = isEdit ? "PUT" : "POST";

      if (activeTab === "products") {
        url = isEdit ? `/api/products/${editItem.id}` : "/api/products";
        const body = { ...form, price: Number(form.price), costPrice: Number(form.costPrice || 0) };
        if (form.sizes) body.sizes = form.sizes.map((s: any) => ({ ...s, priceAdd: Number(s.priceAdd) }));
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
      } else if (activeTab === "categories") {
        url = isEdit ? `/api/categories/${editItem.id}` : "/api/categories";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else {
        url = isEdit ? `/api/toppings/${editItem.id}` : "/api/toppings";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price) }) });
      }
      await fetchAll();
      setShowModal(false);
      showToast(isEdit ? "✅ Đã cập nhật thành công!" : "✅ Đã thêm thành công!");
    } catch {
      showToast("❌ Có lỗi xảy ra!");
    }
    setSaving(false);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Xóa "${item.name}"?`)) return;
    try {
      let url = "";
      if (activeTab === "products") url = `/api/products/${item.id}`;
      else if (activeTab === "categories") url = `/api/categories/${item.id}`;
      else url = `/api/toppings/${item.id}`;
      await fetch(url, { method: "DELETE" });
      await fetchAll();
      showToast("🗑️ Đã xóa thành công!");
    } catch {
      showToast("❌ Không thể xóa!");
    }
  };

  const toggleAvailable = async (product: any) => {
    await fetch(`/api/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, available: !product.available, categoryId: product.categoryId }),
    });
    await fetchAll();
  };

  const addSize = () => setForm((f: any) => ({ ...f, sizes: [...(f.sizes || []), { name: "", priceAdd: 0 }] }));
  const removeSize = (i: number) => setForm((f: any) => ({ ...f, sizes: f.sizes.filter((_: any, idx: number) => idx !== i) }));
  const updateSize = (i: number, key: string, val: any) =>
    setForm((f: any) => ({ ...f, sizes: f.sizes.map((s: any, idx: number) => idx === i ? { ...s, [key]: val } : s) }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🍔 Quản lý Menu</h1>
          <p className="page-subtitle">Quản lý danh mục, sản phẩm và topping</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm mới</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(["products", "categories", "toppings"] as const).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
          >
            {tab === "products" ? "🍹 Sản phẩm" : tab === "categories" ? "📂 Danh mục" : "✨ Topping"}
            <span className={styles.tabCount}>
              {tab === "products" ? products.length : tab === "categories" ? categories.length : toppings.length}
            </span>
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <>
          <div className={styles.productsGrid}>
            {products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product) => (
              <div key={product.id} className={`${styles.productCard} ${!product.available ? styles.unavailable : ""}`}>
              <div className={styles.productImage}>
                {product.image ? <img src={product.image} alt={product.name} /> : <span>🧋</span>}
              </div>
              <div className={styles.productBody}>
                <div className={styles.productHeader}>
                  <span className={styles.catBadge}>{product.category?.icon} {product.category?.name}</span>
                  <label className="switch" title={product.available ? "Đang bán" : "Tạm hết"}>
                    <input type="checkbox" checked={product.available} onChange={() => toggleAvailable(product)} />
                    <span className="switch-slider" />
                  </label>
                </div>
                <h3 className={styles.productName}>{product.name}</h3>
                {product.description && <p className={styles.productDesc}>{product.description}</p>}
                <div className={styles.productSizes}>
                  {product.sizes?.map((s: any) => (
                    <span key={s.id} className={styles.sizeTag}>
                      {s.name}{s.priceAdd > 0 ? ` +${formatCurrency(s.priceAdd)}` : ""}
                    </span>
                  ))}
                </div>
                <div className={styles.productFooter}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className={styles.productPrice}>{formatCurrency(product.price)}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Gốc: {formatCurrency(product.costPrice || 0)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(product)}>✏️ Sửa</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product)}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <div className="empty-state-icon">🍱</div>
              <div className="empty-state-title">Chưa có sản phẩm nào</div>
            </div>
          )}
          </div>
          
          {products.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px", marginBottom: "24px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                <span>Trang {currentPage} / {Math.ceil(products.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === Math.ceil(products.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Icon</th><th>Tên danh mục</th><th>Thứ tự</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {categories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontSize: 24 }}>{cat.icon}</td>
                  <td><strong>{cat.name}</strong></td>
                  <td>{cat.sortOrder}</td>
                  <td><span className={`badge ${cat.active ? "badge-completed" : "badge-cancelled"}`}>{cat.active ? "Hiển thị" : "Ẩn"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)}>✏️ Sửa</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Trang {currentPage} / {Math.ceil(categories.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === Math.ceil(categories.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(categories.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toppings Tab */}
      {activeTab === "toppings" && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead><tr><th>Tên topping</th><th>Giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {toppings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((top) => (
                <tr key={top.id}>
                  <td><strong>{top.name}</strong></td>
                  <td style={{ color: "var(--accent)", fontWeight: 600 }}>{formatCurrency(top.price)}</td>
                  <td><span className={`badge ${top.available ? "badge-completed" : "badge-cancelled"}`}>{top.available ? "Có sẵn" : "Hết"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(top)}>✏️ Sửa</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(top)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {toppings.length > ITEMS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px", marginBottom: "16px" }}>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Trước
              </button>
              <div style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Trang {currentPage} / {Math.ceil(toppings.length / ITEMS_PER_PAGE)}</span>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                disabled={currentPage === Math.ceil(toppings.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(toppings.length / ITEMS_PER_PAGE), p + 1))}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editItem ? "Chỉnh sửa" : "Thêm mới"}{" "}
                {activeTab === "products" ? "sản phẩm" : activeTab === "categories" ? "danh mục" : "topping"}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Product form */}
            {activeTab === "products" && (
              <>
                <div className="form-group">
                  <label className="form-label">Tên sản phẩm *</label>
                  <input className="form-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trà sữa trân châu..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục *</label>
                  <select className="form-select" value={form.categoryId || ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Giá bán (VNĐ) *</label>
                    <input className="form-input" type="number" value={form.price || ""} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="35000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giá gốc (VNĐ) *</label>
                    <input className="form-input" type="number" value={form.costPrice || ""} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="20000" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link ảnh</label>
                  <input className="form-input" value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <input className="form-input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Trà sữa thơm ngon..." />
                </div>
                {/* Sizes */}
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Sizes</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addSize}>+ Thêm size</button>
                  </div>
                  {(form.sizes || []).map((s: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                      <input className="form-input" placeholder="Size (S,M,L)" value={s.name} onChange={(e) => updateSize(i, "name", e.target.value)} />
                      <input className="form-input" type="number" placeholder="Thêm tiền" value={s.priceAdd} onChange={(e) => updateSize(i, "priceAdd", e.target.value)} />
                      <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => removeSize(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Category form */}
            {activeTab === "categories" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Icon</label>
                    <input className="form-input" value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🍹" style={{ textAlign: "center", fontSize: 20 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên danh mục *</label>
                    <input className="form-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trà sữa..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Thứ tự hiển thị</label>
                  <input className="form-input" type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                </div>
                {editItem && (
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <label className="switch">
                        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                        <span className="switch-slider" />
                      </label>
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{form.active ? "Hiển thị" : "Ẩn"}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Topping form */}
            {activeTab === "toppings" && (
              <>
                <div className="form-group">
                  <label className="form-label">Tên topping *</label>
                  <input className="form-input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Trân châu đen..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Giá (VNĐ)</label>
                  <input className="form-input" type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSave} disabled={saving}>
                {saving ? <><span className="loading-spinner" /> Đang lưu...</> : "💾 Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}
