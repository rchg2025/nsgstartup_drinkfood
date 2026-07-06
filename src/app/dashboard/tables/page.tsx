"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";
import { formatCurrency } from "@/lib/utils";

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    zone: "",
    active: true,
  });

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTable ? `/api/tables/${editingTable.id}` : "/api/tables";
      const method = editingTable ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTables();
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bàn này?")) return;
    try {
      const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || "Không thể xóa bàn này.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openModal = (table?: any) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        name: table.name,
        zone: table.zone,
        active: table.active,
      });
    } else {
      setEditingTable(null);
      setFormData({
        name: "",
        zone: "",
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải danh sách bàn...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản lý bàn</h1>
        <button className={styles.primaryBtn} onClick={() => openModal()}>
          + Thêm bàn mới
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tên bàn</th>
                  <th>Khu vực (Zone)</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.id}>
                    <td><strong>{table.name}</strong></td>
                    <td>{table.zone}</td>
                    <td>
                      <span className={`status-badge ${table.active ? 'success' : 'error'}`}>
                        {table.active ? 'Hoạt động' : 'Đã ẩn'}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button 
                        className={styles.editBtn} 
                        onClick={() => openModal(table)}
                      >
                        Sửa
                      </button>
                      <button 
                        className={styles.deleteBtn} 
                        onClick={() => handleDelete(table.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {tables.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Chưa có bàn nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTable ? "Sửa thông tin bàn" : "Thêm bàn mới"}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="form-label">Tên bàn</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Bàn 1, Bàn 2..."
                  required
                />
              </div>
              <div>
                <label className="form-label">Khu vực (Danh mục)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  placeholder="VD: Tầng 1, Sân vườn..."
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="activeCheckbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <label htmlFor="activeCheckbox" style={{ cursor: "pointer", fontWeight: 500 }}>Cho phép hoạt động</label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
