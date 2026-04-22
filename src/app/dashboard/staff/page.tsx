"use client";
import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import styles from "./staff.module.css";

const ROLES = ["ADMIN", "CASHIER", "BARISTA"];
const ROLE_LABELS: Record<string, string> = { ADMIN: "Quản trị viên", CASHIER: "Thu ngân", BARISTA: "Pha chế" };

export default function StaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CASHIER", active: true });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "CASHIER", active: true });
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    if (!editUser && !form.password) return alert("Vui lòng nhập mật khẩu!");
    setSaving(true);
    try {
      const isEdit = !!editUser;
      const url = isEdit ? `/api/users/${editUser.id}` : "/api/users";
      const body: any = { name: form.name, email: form.email, role: form.role, active: form.active };
      if (!isEdit || form.password) body.password = form.password;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      await fetchUsers();
      setShowModal(false);
      showToast(isEdit ? "✅ Đã cập nhật nhân viên!" : "✅ Đã thêm nhân viên!");
    } catch (err: any) {
      showToast(`❌ ${err.message || "Có lỗi xảy ra!"}`);
    }
    setSaving(false);
  };

  const handleToggleActive = async (user: any) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user.name, role: user.role, active: !user.active }),
    });
    await fetchUsers();
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên ${user.name}?\nHành động này không thể hoàn tác!`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Không thể xóa nhân viên này");
      showToast("✅ Đã xóa nhân viên!");
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
    }
  };

  const allCount = users.length;
  const activeCount = users.filter(u => u.active).length;
  const byRole = ROLES.map(r => ({ role: r, count: users.filter(u => u.role === r).length }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Quản lý nhân viên</h1>
          <p className="page-subtitle">Thêm và quản lý tài khoản nhân viên</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Thêm nhân viên</button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{allCount}</span>
          <span className={styles.statLabel}>Tổng nhân viên</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum} style={{ color: "var(--green)" }}>{activeCount}</span>
          <span className={styles.statLabel}>Đang hoạt động</span>
        </div>
        {byRole.map(({ role, count }) => (
          <div key={role} className={styles.statCard}>
            <span className={styles.statNum} style={{ color: role === "ADMIN" ? "var(--accent)" : role === "CASHIER" ? "var(--blue)" : "var(--purple)" }}>{count}</span>
            <span className={styles.statLabel}>{ROLE_LABELS[role]}</span>
          </div>
        ))}
      </div>

      {/* User Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 12px" }} /> Đang tải...
        </div>
      ) : (
        <div className={styles.userGrid}>
          {users.map((user) => (
            <div key={user.id} className={`${styles.userCard} ${!user.active ? styles.inactive : ""}`}>
              <div className={styles.cardTop}>
                <div className={styles.avatar} style={{
                  background: user.role === "ADMIN"
                    ? "linear-gradient(135deg, var(--accent), var(--accent-dark))"
                    : user.role === "CASHIER"
                    ? "linear-gradient(135deg, var(--blue), #2563eb)"
                    : "linear-gradient(135deg, var(--purple), #7c3aed)"
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.name}</div>
                  <div className={styles.userEmail}>{user.email}</div>
                </div>
                <label className="switch" title={user.active ? "Đang hoạt động" : "Đã vô hiệu"}>
                  <input type="checkbox" checked={user.active} onChange={() => handleToggleActive(user)} />
                  <span className="switch-slider" />
                </label>
              </div>
              <div className={styles.cardMeta}>
                <span className={`badge badge-${user.role.toLowerCase()}`}>{ROLE_LABELS[user.role]}</span>
                <span className={styles.joinDate}>Từ {formatDate(user.createdAt)}</span>
              </div>
              <div className={styles.cardActions} style={{ gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => openEdit(user)}>
                  ✏️ Chỉnh sửa
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: "center", background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "1px solid rgba(239, 68, 68, 0.3)" }} onClick={() => handleDelete(user)}>
                  🗑️ Xóa
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="empty-state" style={{ gridColumn: "1/-1" }}>
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-title">Chưa có nhân viên nào</div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập *</label>
              <input className="form-input" type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nguyen_van_a hoặc a@nsg.vn" disabled={!!editUser} />
            </div>
            <div className="form-group">
              <label className="form-label">{editUser ? "Mật khẩu mới (bỏ trống để giữ nguyên)" : "Mật khẩu *"}</label>
              <input className="form-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">Vai trò</label>
              <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {editUser && (
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label className="switch">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                    <span className="switch-slider" />
                  </label>
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{form.active ? "Hoạt động" : "Vô hiệu hóa"}</span>
                </div>
              </div>
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

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith("✅") ? "toast-success" : "toast-error"}`}>{toast}</div>
        </div>
      )}
    </div>
  );
}
