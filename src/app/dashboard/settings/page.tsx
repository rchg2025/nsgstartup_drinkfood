"use client";
import { useEffect, useState } from "react";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const [bankCode, setBankCode] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [commissionRate, setCommissionRate] = useState("50");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.bank_code) setBankCode(data.bank_code);
        if (data.bank_account) setBankAccount(data.bank_account);
        if (data.bank_account_name) setBankAccountName(data.bank_account_name);
        if (data.commission_rate) setCommissionRate(data.commission_rate);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_code: bankCode,
          bank_account: bankAccount,
          bank_account_name: bankAccountName.toUpperCase(),
          commission_rate: commissionRate,
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

  if (loading) {
    return <div className="loading-spinner" style={{ margin: "40px auto" }} />;
  }

  return (
    <div className={styles.container}>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Cấu hình hệ thống</h1>
          <p className="page-subtitle">Quản lý các cài đặt chung cho cửa hàng</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 16, fontSize: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
          Thông tin tự động Thanh toán (VietQR)
        </h2>
        <form onSubmit={handleSave} className={styles.formContainer}>
          <div className="form-group">
            <label className="form-label">Tên Ngân Hàng (Mã Ngân hàng)</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: MB, VCB, BIDV, TCB"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
            />
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Nhập mã ngân hàng hoặc Tên viết tắt ngắn gọn (ví dụ: MB, Vietcombank, Techcombank).
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Số Tài Khoản</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập số tài khoản ngân hàng"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              required
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
              required
            />
          </div>

          <h2 style={{ marginTop: 24, marginBottom: 16, fontSize: 18, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            Thiết lập Hoa hồng Nhân viên
          </h2>
          <div className="form-group">
            <label className="form-label">Tỉ lệ hoa hồng (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              className="form-input"
              style={{ paddingRight: "40px" }}
              placeholder="VD: 40"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              required
            />
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Phần trăm chia sẻ hoa hồng cho thu ngân từ khoản lợi nhuận (Ví dụ: 40%). Mặc định hệ thống là 50%.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "⏳ Đang lưu..." : "💾 Lưu Cấu Hình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
