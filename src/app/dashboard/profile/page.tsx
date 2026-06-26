"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getDriveImageUrl } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const role = (session?.user as any)?.role || "";
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contactEmail: "", password: "" });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          name: data.name || "",
          contactEmail: data.contactEmail || "",
          password: "",
        });
      }
    } catch (error) {
      showToast("Lỗi khi tải thông tin");
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    showToast("Đang tải ảnh lên Google Drive...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        // Cập nhật URL avatar vào profile
        const putRes = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: data.url })
        });
        
        if (putRes.ok) {
          showToast("✅ Đã cập nhật ảnh đại diện");
          fetchProfile();
          if (update) update(); // reload session
        } else {
          showToast("❌ Lỗi khi cập nhật link ảnh vào hồ sơ");
        }
      } else {
        showToast("❌ " + (data.error || "Lỗi khi tải ảnh lên"));
      }
    } catch (error) {
      showToast("❌ Lỗi mạng khi tải ảnh");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name) return showToast("Họ tên không được để trống!");
    
    setSaving(true);
    try {
      const body: any = { name: form.name };
      if (form.password) body.password = form.password;
      if (role === "ADMIN") body.contactEmail = form.contactEmail;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast("✅ Đã cập nhật hồ sơ");
        setForm(prev => ({ ...prev, password: "" }));
        fetchProfile();
        // Cập nhật session nếu đổi tên
        if (update) {
          update({ name: form.name });
        }
      } else {
        const d = await res.json();
        showToast("❌ " + (d.error || "Có lỗi xảy ra"));
      }
    } catch (error) {
      showToast("❌ Lỗi mạng");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        <div className="loading-spinner" style={{ margin: "0 auto 12px" }}></div>
        Đang tải hồ sơ...
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      {toast && <div className="toast">{toast}</div>}
      
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", margin: "0 0 8px 0" }}>Hồ sơ cá nhân</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>Quản lý thông tin và tài khoản của bạn</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        {/* Form bên trái */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>Thông tin cơ bản</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <label style={{ cursor: uploading ? "not-allowed" : "pointer", position: "relative", display: "inline-block" }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleUpload} 
                style={{ display: "none" }} 
                disabled={uploading}
              />
              {profile?.avatar ? (
                <img 
                  src={getDriveImageUrl(profile.avatar)} 
                  alt="Avatar" 
                  style={{ 
                    width: 80, height: 80, borderRadius: 40, objectFit: "cover",
                    border: "2px solid var(--border)", opacity: uploading ? 0.5 : 1
                  }} 
                />
              ) : (
                <div style={{ 
                  width: 80, height: 80, borderRadius: 40, 
                  background: "linear-gradient(135deg, var(--accent), var(--accent-dark))",
                  color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, fontWeight: "bold", opacity: uploading ? 0.5 : 1
                }}>
                  {profile?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              {/* Icon overlay */}
              <div style={{ 
                position: "absolute", bottom: 0, right: 0, background: "var(--accent)", color: "white", 
                width: 24, height: 24, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: 12, border: "2px solid white", pointerEvents: "none"
              }}>
                📷
              </div>
            </label>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 20 }}>{profile?.name}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Tài khoản: {profile?.email}</div>
              <span className={`badge badge-${role.toLowerCase()}`} style={{ marginTop: 8 }}>{role}</span>
              {uploading && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>Đang tải lên...</div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input 
              className="form-input" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              placeholder="Nhập họ và tên..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên đăng nhập (Read-only)</label>
            <input className="form-input" value={profile?.email || ""} disabled style={{ background: "var(--bg-secondary)" }} />
          </div>

          {role === "ADMIN" && (
            <div className="form-group">
              <label className="form-label">Email nhận thông báo (Chỉ Admin)</label>
              <input 
                className="form-input" 
                type="email"
                value={form.contactEmail} 
                onChange={e => setForm({...form, contactEmail: e.target.value})} 
                placeholder="email@example.com"
              />
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Dùng để nhận báo cáo doanh thu, cảnh báo tồn kho...</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Đổi mật khẩu mới (Bỏ trống để giữ nguyên)</label>
            <input 
              className="form-input" 
              type="password"
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})} 
              placeholder="••••••••"
            />
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><span className="loading-spinner"></span> Đang lưu...</> : "💾 Lưu thay đổi"}
          </button>
        </div>

        {/* Lịch sử bên phải */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>Lịch sử hoạt động gần đây</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {profile?.activityLogs?.length > 0 ? (
              profile.activityLogs.map((log: any) => (
                <div key={log.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: 16, background: "var(--bg-secondary)", 
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0
                  }}>
                    🕒
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{log.action}</div>
                    {log.details && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{log.details}</div>}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {new Date(log.createdAt).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-muted)", background: "var(--bg-secondary)", borderRadius: 8 }}>
                Chưa có hoạt động nào được ghi nhận.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
