"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function ReportPage() {
  const [data, setData] = useState<{ summary: any; products: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cashierFilter, setCashierFilter] = useState("");
  const [cashiersList, setCashiersList] = useState<any[]>([]);

  const [productsPage, setProductsPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchCashiers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        setCashiersList(users.filter((u: any) => u.role === "CASHIER" || u.role === "ADMIN"));
      }
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = "/api/stats/report?";
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (cashierFilter) url += `cashierId=${cashierFilter}&`;
      const res = await fetch(url);
      if (res.ok) {
        setData(await res.json());
        setProductsPage(1);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi tải dữ liệu");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, cashierFilter]);

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      if (!data?.products) return;

      const exportData = data.products.map(p => ({
        "Tên sản phẩm": p.name,
        "Số lượng bán": p.quantity,
        "Doanh thu (đ)": p.revenue,
        "Lợi nhuận gộp (đ)": p.profit
      }));

      // Summary row
      XLSX.utils.sheet_add_json;
      const summaryRow = [
        {
          "Tên sản phẩm": "──── TỔNG CỘNG ────",
          "Số lượng bán": data.summary.totalItemsSold,
          "Doanh thu (đ)": data.summary.totalRevenue,
          "Lợi nhuận gộp (đ)": data.summary.totalProfit
        },
        {
          "Tên sản phẩm": "Hoa hồng nhân viên (-)",
          "Số lượng bán": "",
          "Doanh thu (đ)": "",
          "Lợi nhuận gộp (đ)": -data.summary.totalCommission
        },
        {
          "Tên sản phẩm": "Lợi nhuận ròng",
          "Số lượng bán": "",
          "Doanh thu (đ)": "",
          "Lợi nhuận gộp (đ)": data.summary.netProfit
        }
      ];

      const ws = XLSX.utils.json_to_sheet([...exportData, ...summaryRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BaoCaoBanHang");
      const cashierName = cashiersList.find(c => c.id === cashierFilter)?.name || "TatCaNV";
      const fileName = `BaoCao_${cashierFilter ? cashierName : "TatCa"}_${startDate || "All"}_${endDate || "All"}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      alert("Không thể xuất Excel");
    }
  };

  if (loading && !data) {
    return <div className="loading-spinner" style={{ margin: "40px auto" }} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Thống kê & Báo cáo</h1>
          <p className="page-subtitle">Báo cáo số lượng bán ra, doanh thu và sản phẩm</p>
        </div>
        <button className="btn btn-secondary" onClick={exportExcel} disabled={!data?.products?.length}>
          📥 Xuất Excel Báo Cáo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Từ:</span>
        <input
          type="date"
          className="form-input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ flex: "1 1 130px", minWidth: 0, maxWidth: 160 }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>Đến:</span>
        <input
          type="date"
          className="form-input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ flex: "1 1 130px", minWidth: 0, maxWidth: 160 }}
        />
        <select
          className="form-select"
          value={cashierFilter}
          onChange={(e) => setCashierFilter(e.target.value)}
          style={{ flex: "1 1 140px", minWidth: 0, maxWidth: 200 }}
        >
          <option value="">Tất cả nhân viên</option>
          {cashiersList.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(startDate || endDate || cashierFilter) && (
          <button className="btn btn-secondary btn-sm" style={{ whiteSpace: "nowrap" }} onClick={() => { setStartDate(""); setEndDate(""); setCashierFilter(""); }}>
            ✕ Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid var(--blue)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>SẢN PHẨM KHẢ DỤNG</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>{data?.summary.totalProducts || 0}</div>
        </div>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid var(--purple)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>SỐ LƯỢNG BÁN RA</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>{data?.summary.totalItemsSold || 0} món</div>
        </div>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid var(--accent)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>TỔNG DOANH THU</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--accent)" }}>{formatCurrency(data?.summary.totalRevenue || 0)}</div>
        </div>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid #10b981" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>LỢI NHUẬN GỘP</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--green)" }}>{formatCurrency(data?.summary.totalProfit || 0)}</div>
        </div>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid var(--purple)" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>HOA HỒNG NHÂN VIÊN</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--purple)" }}>{formatCurrency(data?.summary.totalCommission || 0)}</div>
        </div>
        <div className="card" style={{ padding: "16px", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>LỢI NHUẬN RÒNG</div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--yellow)" }}>{formatCurrency(data?.summary.netProfit || 0)}</div>
        </div>
      </div>

      {/* Product table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style={{ textAlign: "center" }}>Số lượng bán</th>
                <th style={{ textAlign: "right" }}>Doanh thu</th>
                <th style={{ textAlign: "right" }}>Lợi nhuận gộp</th>
              </tr>
            </thead>
            <tbody>
              {data?.products?.slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE).map((p, idx) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <strong>{(productsPage - 1) * ITEMS_PER_PAGE + idx + 1}.</strong>
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "4px 10px", backgroundColor: "rgba(108, 155, 255, 0.1)", color: "var(--blue)", borderRadius: "20px", fontWeight: "bold" }}>
                      {p.quantity} ly
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "600" }}>{formatCurrency(p.revenue)}</td>
                  <td style={{ textAlign: "right", color: "var(--green)", fontWeight: "700" }}>{formatCurrency(p.profit)}</td>
                </tr>
              ))}
              {(!data?.products || data.products.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Chưa có dữ liệu bán hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data?.products && data.products.length > ITEMS_PER_PAGE && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", padding: "16px" }}>
            <button className="btn btn-secondary btn-sm" disabled={productsPage === 1} onClick={() => setProductsPage(p => p - 1)}>Trước</button>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Trang {productsPage} / {Math.ceil(data.products.length / ITEMS_PER_PAGE)}</div>
            <button className="btn btn-secondary btn-sm" disabled={productsPage === Math.ceil(data.products.length / ITEMS_PER_PAGE)} onClick={() => setProductsPage(p => p + 1)}>Sau</button>
          </div>
        )}
      </div>
    </div>
  );
}
