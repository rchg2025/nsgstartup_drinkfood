"use client";
import { useEffect, useState } from "react";
import * as xlsx from "xlsx";
import styles from "./logs.module.css";

type Log = {
  id: string;
  userId: string;
  action: string;
  details: string;
  createdAt: string;
  user: { name: string; role: string };
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Fetch users for the dropdown
    fetch("/api/users")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, []);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", p.toString());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (userIdFilter) params.set("userId", userIdFilter);

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(1);
  }, [startDate, endDate, userIdFilter]);

  const handleExport = async () => {
    // Fetch all records for export (temporarily set high limit or just use the current data?)
    // The user requested xlsx export. We will export whatever is retrieved but let's query all matched for these filters.
    // For simplicity, we can fetch page=1 & limit=1000 or export current logs.
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "5000"); // Assuming we adjust API or just use a big number
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (userIdFilter) params.set("userId", userIdFilter);

    try {
      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();
      const exportData = (data.logs || []).map((l: Log) => ({
        "Thời gian": new Date(l.createdAt).toLocaleString("vi-VN"),
        "Nhân viên": l.user?.name || "Không rõ",
        "Quyền": l.user?.role || "",
        "Thao tác": l.action,
        "Chi tiết": l.details || "",
      }));

      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Logs");
      xlsx.writeFile(wb, `NSG_Activity_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (e) {
      console.error("Export error", e);
      alert("Lỗi xuất file excel");
    }
  };

  return (
    <div className={styles.container}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📝 Nhật ký hoạt động</h1>
          <p className="page-subtitle">Theo dõi lịch sử thao tác của các thành viên trên hệ thống (Tối đa 20 dòng / trang)</p>
        </div>
        <button onClick={handleExport} className="btn" style={{ background: '#10b981', color: 'white' }}>
          📥 Xuất Excel (.xlsx)
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Từ ngày</label>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>Đến ngày</label>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>Nhân viên</label>
          <select className="form-input" value={userIdFilter} onChange={e => setUserIdFilter(e.target.value)}>
            <option value="">-- Tất cả nhân viên --</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="loading-spinner" style={{ margin: "40px auto" }} />
        ) : (
          <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Nhân viên</th>
                  <th>Thao tác</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "30px 0" }}>Không có dữ liệu</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.user?.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{log.user?.role}</div>
                      </td>
                      <td>
                        <span style={{ background: "rgba(37, 99, 235, 0.1)", color: "var(--accent)", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="btn btn-outline">
            Trước
          </button>
          <span>Trang {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} className="btn btn-outline">
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
