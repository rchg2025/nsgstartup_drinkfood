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
        data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
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
    <div className="tables-dashboard-container">
      <style>{`
        .tables-dashboard-container {
          padding: 24px;
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .btn-add {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }
        .tables-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          overflow: hidden;
          border: 1px solid #f1f5f9;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .modern-table th {
          background: #f8fafc;
          padding: 16px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
        }
        .modern-table td {
          padding: 16px 20px;
          font-size: 15px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .modern-table tr:hover td {
          background: #f8fafc;
        }
        .modern-table tr:last-child td {
          border-bottom: none;
        }
        .table-name {
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .table-icon {
          width: 32px;
          height: 32px;
          background: #eff6ff;
          color: #3b82f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .zone-badge {
          display: inline-block;
          padding: 4px 10px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        .status-active {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
        }
        .status-inactive {
          display: inline-block;
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
        }
        .action-btns {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .btn-edit, .btn-delete {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-edit {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-edit:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .btn-delete {
          background: #fef2f2;
          color: #ef4444;
        }
        .btn-delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        /* Modal Styles */
        .modern-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modern-modal {
          background: white;
          width: 100%;
          max-width: 480px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
          animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .modern-modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modern-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .modern-modal-close {
          background: transparent;
          border: none;
          font-size: 20px;
          color: #94a3b8;
          cursor: pointer;
          width: 32px; height: 32px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .modern-modal-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .modern-modal-body {
          padding: 24px;
        }
        .modern-input-group {
          margin-bottom: 20px;
        }
        .modern-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 8px;
        }
        .modern-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.2s;
          outline: none;
        }
        .modern-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
        .modern-checkbox-group {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
        }
        .modern-checkbox-group input[type="checkbox"] {
          width: 18px; height: 18px;
          cursor: pointer;
        }
        .modern-checkbox-group label {
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
          margin: 0;
        }
        .modern-modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }
        .btn-cancel {
          flex: 1;
          padding: 12px;
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover {
          background: #f1f5f9;
        }
        .btn-save {
          flex: 1;
          padding: 12px;
          background: #3b82f6;
          border: none;
          color: white;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
        .btn-save:hover {
          background: #2563eb;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }
        
        @media (max-width: 768px) {
          .modern-table thead { display: none; }
          .modern-table, .modern-table tbody, .modern-table tr, .modern-table td { display: block; width: 100%; }
          .modern-table tr { margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; padding: 12px; }
          .modern-table td { border: none; padding: 8px 0; display: flex; justify-content: space-between; align-items: center; text-align: right; }
          .modern-table td::before { content: attr(data-label); font-weight: 600; color: #64748b; font-size: 13px; text-transform: uppercase; }
          .action-btns { width: 100%; justify-content: flex-end; margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
          .tables-card { background: transparent; box-shadow: none; border: none; }
          .tables-dashboard-container { padding: 16px; }
        }
      `}</style>

      <div className="page-header">
        <h1 className="page-title">Quản lý Bàn</h1>
        <button className="btn-add" onClick={() => openModal()}>
          <span>+</span> Thêm bàn mới
        </button>
      </div>

      <div className="tables-card">
        {tables.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px" }}>Chưa có bàn nào</h3>
            <p style={{ margin: 0 }}>Hãy thêm bàn để khách hàng có thể chọn khi đặt món.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Tên bàn</th>
                  <th>Khu vực</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.id}>
                    <td data-label="Tên bàn">
                      <div className="table-name">
                        <div className="table-icon">🪑</div>
                        {table.name}
                      </div>
                    </td>
                    <td data-label="Khu vực">
                      <span className="zone-badge">{table.zone}</span>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={table.active ? 'status-active' : 'status-inactive'}>
                        {table.active ? '✅ Hoạt động' : '🚫 Đã ẩn'}
                      </span>
                    </td>
                    <td data-label="Thao tác" style={{ textAlign: "right" }}>
                      <div className="action-btns">
                        <button className="btn-edit" onClick={() => openModal(table)}>
                          ✏️ Sửa
                        </button>
                        <button className="btn-delete" onClick={() => handleDelete(table.id)}>
                          🗑️ Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modern-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modern-modal-header">
              <h2 className="modern-modal-title">{editingTable ? "Sửa thông tin bàn" : "Thêm bàn mới"}</h2>
              <button className="modern-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modern-modal-body">
                <div className="modern-input-group">
                  <label className="modern-label">Tên bàn</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Bàn 1, Bàn 2..."
                    required
                  />
                </div>
                <div className="modern-input-group">
                  <label className="modern-label">Khu vực (Zone)</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    placeholder="VD: Tầng 1, Sân vườn..."
                    required
                  />
                </div>
                <label className="modern-checkbox-group">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span>Cho phép hoạt động (Khách có thể chọn)</span>
                </label>
              </div>
              <div className="modern-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn-save">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
