"use client";
import { useEffect, useState } from "react";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "storage" | "email">("storage");
  const [bankCode, setBankCode] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bandBankCode, setBandBankCode] = useState("");
  const [bandBankAccount, setBandBankAccount] = useState("");
  const [bandBankAccountName, setBandBankAccountName] = useState("");
  const [commissionRate, setCommissionRate] = useState("50");
  const [gdriveClientEmail, setGdriveClientEmail] = useState("");
  const [gdrivePrivateKey, setGdrivePrivateKey] = useState("");
  const [gdriveFolderId, setGdriveFolderId] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.bank_code) setBankCode(data.bank_code);
        if (data.bank_account) setBankAccount(data.bank_account);
        if (data.bank_account_name) setBankAccountName(data.bank_account_name);
        if (data.band_bank_code) setBandBankCode(data.band_bank_code);
        if (data.band_bank_account) setBandBankAccount(data.band_bank_account);
        if (data.band_bank_account_name) setBandBankAccountName(data.band_bank_account_name);
        if (data.commission_rate) setCommissionRate(data.commission_rate);
        if (data.gdrive_client_email) setGdriveClientEmail(data.gdrive_client_email);
        if (data.gdrive_private_key) setGdrivePrivateKey(data.gdrive_private_key);
        if (data.gdrive_folder_id) setGdriveFolderId(data.gdrive_folder_id);
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(data.smtp_port);
        if (data.smtp_from_name) setSmtpFromName(data.smtp_from_name);
        if (data.smtp_user) setSmtpUser(data.smtp_user);
        if (data.smtp_pass) setSmtpPass(data.smtp_pass);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_code: bankCode,
          bank_account: bankAccount,
          bank_account_name: bankAccountName.toUpperCase(),
          band_bank_code: bandBankCode,
          band_bank_account: bandBankAccount,
          band_bank_account_name: bandBankAccountName.toUpperCase(),
          commission_rate: commissionRate,
          gdrive_client_email: gdriveClientEmail,
          gdrive_private_key: gdrivePrivateKey,
          gdrive_folder_id: gdriveFolderId,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_from_name: smtpFromName,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
        }),
      });
      if (res.ok) {
        alert("Lưu cấu hình thành công!");
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (err) {
      alert("Lỗi kết nối.");
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/upload/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: gdriveClientEmail,
          privateKey: gdrivePrivateKey,
          folderId: gdriveFolderId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ Kết nối thành công!\nThư mục: ${data.folder.name}`);
      } else {
        alert(`❌ Kết nối thất bại:\n${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err.message}`);
    }
    setTesting(false);
  };

  const handlePrivateKeyPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setGdrivePrivateKey(val);
    
    // Try to parse JSON if the user pastes the entire service account JSON
    try {
      if (val.trim().startsWith("{")) {
        const json = JSON.parse(val);
        if (json.private_key && json.client_email) {
          setGdrivePrivateKey(json.private_key);
          if (!gdriveClientEmail) {
            setGdriveClientEmail(json.client_email);
          }
        }
      }
    } catch (err) {
      // Not a valid JSON, just ignore
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          user: smtpUser,
          pass: smtpPass,
          fromName: smtpFromName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Đã gửi email test thành công! Vui lòng kiểm tra hộp thư của bạn.");
      } else {
        alert(`❌ Lỗi gửi email: \n${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err.message}`);
    }
    setTestingEmail(false);
  };

  if (loading) {
    return <div className="loading-spinner" style={{ margin: "40px auto" }} />;
  }

  return (
    <div className={styles.container} style={{ maxWidth: 1000 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Cấu hình Hệ thống</h1>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", backgroundColor: "var(--card-bg)" }}>
          <button
            style={{
              padding: "16px 24px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "general" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "general" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "general" ? 600 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15
            }}
            onClick={() => setActiveTab("general")}
          >
            ⚙️ Cấu hình Chung
          </button>
          <button
            style={{
              padding: "16px 24px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "storage" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "storage" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "storage" ? 600 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15
            }}
            onClick={() => setActiveTab("storage")}
          >
            ☁️ Cấu hình Lưu trữ (Google Drive)
          </button>
          <button
            style={{
              padding: "16px 24px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "email" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "email" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "email" ? 600 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 15
            }}
            onClick={() => setActiveTab("email")}
          >
            ✉️ Cấu hình Gửi Email (SMTP)
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {activeTab === "general" && (
            <form onSubmit={handleSave} className={styles.formContainer}>
              <h2 style={{ marginBottom: 16, fontSize: 18, color: "var(--text)" }}>
                Thông tin tự động Thanh toán (VietQR)
              </h2>
              <div className="form-group">
                <label className="form-label">Tên Ngân Hàng (Mã Ngân hàng)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: MB, VCB, BIDV, TCB"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Số Tài Khoản</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập số tài khoản ngân hàng"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tên Chủ Tài Khoản</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VIET HOA CHU KHONG DAU"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                />
              </div>

              <h2 style={{ marginTop: 24, marginBottom: 16, fontSize: 18, color: "var(--text)" }}>
                Thông tin Tài khoản Bồi dưỡng (Band nhạc)
              </h2>
              <div className="form-group">
                <label className="form-label">Tên Ngân Hàng Band (Mã Ngân hàng)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: MB, VCB, BIDV, TCB"
                  value={bandBankCode}
                  onChange={(e) => setBandBankCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Số Tài Khoản Band</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập số tài khoản ngân hàng của Band"
                  value={bandBankAccount}
                  onChange={(e) => setBandBankAccount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tên Chủ Tài Khoản Band</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VIET HOA CHU KHONG DAU"
                  value={bandBankAccountName}
                  onChange={(e) => setBandBankAccountName(e.target.value.toUpperCase())}
                />
              </div>


              <h2 style={{ marginTop: 24, marginBottom: 16, fontSize: 18, color: "var(--text)" }}>
                Thiết lập Hoa hồng Nhân viên
              </h2>
              <div className="form-group">
                <label className="form-label">Tỉ lệ hoa hồng (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="VD: 40"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "⏳ Đang lưu..." : "💾 Lưu Cấu Hình"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "storage" && (
            <div className={styles.formContainer}>
              <h2 style={{ marginBottom: 20, fontSize: 18, display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
                🗄️ API Lưu trữ ảnh
              </h2>
              
              <div style={{ 
                backgroundColor: "rgba(16, 185, 129, 0.1)", 
                border: "1px solid rgba(16, 185, 129, 0.2)",
                padding: 16, 
                borderRadius: 8, 
                marginBottom: 24 
              }}>
                <h4 style={{ color: "#10b981", margin: "0 0 8px 0", fontSize: 14 }}>Thông tin Service Account</h4>
                <p style={{ color: "#059669", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  Vui lòng tạo Service Account trên Google Cloud Console, chia sẻ Folder Drive cho Email của Service Account với quyền "Người chỉnh sửa", và bật chia sẻ liên kết Folder "Bất kỳ ai có liên kết".
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Client Email (Email Service Account)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: cdsupload@project.iam.gserviceaccount.com"
                  value={gdriveClientEmail}
                  onChange={(e) => setGdriveClientEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Private Key</label>
                <textarea
                  className="form-input"
                  rows={6}
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                  placeholder="Có thể dán trực tiếp toàn bộ chuỗi JSON của Service Account vào đây, hệ thống sẽ tự động trích xuất Private Key và Client Email."
                  value={gdrivePrivateKey}
                  onChange={handlePrivateKeyPaste}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Folder ID (Thư mục lưu ảnh)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: 15fMfGh9fFKS1S2hYVjc934JQJ09sHetN"
                  value={gdriveFolderId}
                  onChange={(e) => setGdriveFolderId(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleTestConnection}
                  disabled={testing}
                  style={{ backgroundColor: "var(--card-bg)", color: "var(--text)" }}
                >
                  {testing ? "⏳ Đang test..." : "⚡ Test kết nối"}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleSave()}
                  disabled={saving}
                >
                  {saving ? "⏳ Đang lưu..." : "✓ Lưu cấu hình Drive"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span style={{ fontSize: 24 }}>⚙️</span>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Máy chủ gửi Email</h2>
              </div>

              <div style={{ backgroundColor: "#EFF6FF", padding: 16, borderRadius: 8, marginBottom: 24, border: "1px solid #BFDBFE" }}>
                <div style={{ fontWeight: 600, color: "#1E3A8A", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>✉️</span> Hướng dẫn cấu hình Gmail
                </div>
                <ul style={{ margin: 0, paddingLeft: 24, color: "#1E40AF", fontSize: 13, lineHeight: 1.6 }}>
                  <li><b>SMTP Host:</b> smtp.gmail.com</li>
                  <li><b>SMTP Port:</b> 465 (hoặc 587)</li>
                  <li><b>Tài khoản Email:</b> Email Gmail của bạn (VD: admin@gmail.com).</li>
                  <li><b>Mật khẩu:</b> <b>Mật khẩu ứng dụng</b> (App Password) - Không dùng mật khẩu đăng nhập. Xem hướng dẫn tạo tại tài khoản Google.</li>
                </ul>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SMTP Host</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SMTP Port</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="465"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email gửi đi (Từ ai?)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Device Manager Nam Sai Gon"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tài khoản Email (Username)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: chuyendoiso@nsgpc.edu.vn"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu (App Password)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••••••"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  style={{ backgroundColor: "var(--card-bg)", color: "var(--text)" }}
                >
                  {testingEmail ? "⏳ Đang gửi..." : "⚡ Test gửi Email"}
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleSave()}
                  disabled={saving}
                >
                  {saving ? "⏳ Đang lưu..." : "✓ Lưu cấu hình SMTP"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

