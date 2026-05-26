"use client";
import { useState, useEffect } from "react";
import { formatCurrency, formatTime } from "@/lib/utils";
import * as XLSX from "xlsx";
import styles from "./page.module.css";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddStock, setShowAddStock] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Form state
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filter and pagination state
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStock, setFilterStock] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory");
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/inventory/logs");
      const data = await res.json();
      setLogs(data);
    } catch (e) {}
  };

  const [historySearchText, setHistorySearchText] = useState("");

  const handleOpenAddStock = (product: any) => {
    setSelectedProduct(product);
    setQuantityToAdd("");
    setNote("");
    setShowAddStock(true);
  };

  const handleOpenHistory = () => {
    fetchLogs();
    setHistorySearchText("");
    setShowHistory(true);
  };

  const handleExportExcel = () => {
    if (logs.length === 0) return;
    
    // Prepare data for Excel
    const data = filteredLogs.map((log) => ({
      "Sản phẩm": log.product?.name || "N/A",
      "Số lượng nhập": log.quantityAdded,
      "Ghi chú": log.note || "",
      "Người nhập": log.user?.name || "Hệ thống",
      "Thời gian": formatTime(log.createdAt),
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LichSuNhapHang");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `LichSuNhapHang_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSubmitAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantityToAdd || isNaN(Number(quantityToAdd)) || Number(quantityToAdd) <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityAdded: Number(quantityToAdd),
          note
        })
      });

      if (res.ok) {
        setShowAddStock(false);
        fetchInventory();
      } else {
        alert("Lỗi khi thêm số lượng");
      }
    } catch (e) {
      alert("Lỗi hệ thống");
    }
    setSubmitting(false);
  };

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)));

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const term = historySearchText.toLowerCase();
    const matchProduct = log.product?.name?.toLowerCase().includes(term);
    const matchNote = log.note?.toLowerCase().includes(term);
    const matchUser = log.user?.name?.toLowerCase().includes(term);
    return matchProduct || matchNote || matchUser;
  });

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = filterCategory === "ALL" || p.category?.name === filterCategory;
    
    let matchStock = true;
    if (filterStock === "INSTOCK") matchStock = p.stockQuantity > 0;
    if (filterStock === "LOWSTOCK") matchStock = p.stockQuantity > 0 && p.stockQuantity <= 10;
    if (filterStock === "OUTOFSTOCK") matchStock = p.stockQuantity === 0;

    return matchSearch && matchCategory && matchStock;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterCategory, filterStock]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>📦 Quản lý kho</h1>
          <p className={styles.subtitle}>Kiểm soát số lượng tồn kho của các sản phẩm</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleOpenHistory}>
          Lịch sử nhập hàng
        </button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input 
            type="text" 
            placeholder="Tìm kiếm sản phẩm..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">Tất cả danh mục</option>
            {categories.map((c: any) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select 
            value={filterStock} 
            onChange={(e) => setFilterStock(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="INSTOCK">Còn hàng</option>
            <option value="LOWSTOCK">Sắp hết hàng (≤10)</option>
            <option value="OUTOFSTOCK">Hết hàng</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.productTable}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Tồn kho</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>Đang tải dữ liệu...</td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>Không tìm thấy sản phẩm nào phù hợp</td>
              </tr>
            ) : (
              paginatedProducts.map((p) => (
                <tr key={p.id} className={styles.productRow}>
                  <td>
                    <div className={styles.productInfo}>
                      <img src={p.image || "https://placehold.co/100x100?text=No+Image"} alt={p.name} className={styles.productImage} />
                      <span className={styles.productName}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category?.name}</td>
                  <td>
                    <span className={`${styles.stockBadge} ${p.stockQuantity > 10 ? styles.inStock : p.stockQuantity > 0 ? styles.lowStock : styles.outOfStock}`}>
                      {p.stockQuantity} {p.stockQuantity === 0 && "(Hết hàng)"}
                    </span>
                  </td>
                  <td>
                    <button className={styles.btnAction} onClick={() => handleOpenAddStock(p)}>
                      + Nhập hàng
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            className={styles.pageBtn} 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            ❮ Trước
          </button>
          <span className={styles.pageInfo}>
            Trang {currentPage} / {totalPages}
          </span>
          <button 
            className={styles.pageBtn} 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Sau ❯
          </button>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => !submitting && setShowAddStock(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Nhập thêm hàng</h3>
            </div>
            <form onSubmit={handleSubmitAddStock}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Sản phẩm</label>
                  <input type="text" className={styles.input} value={selectedProduct.name} disabled />
                </div>
                <div className={styles.formGroup}>
                  <label>Số lượng hiện tại</label>
                  <input type="text" className={styles.input} value={selectedProduct.stockQuantity} disabled />
                </div>
                <div className={styles.formGroup}>
                  <label>Số lượng nhập thêm</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    min="1"
                    value={quantityToAdd} 
                    onChange={e => setQuantityToAdd(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Ghi chú (Tùy chọn)</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="VD: Nhập lô hàng mới tháng 10..."
                    value={note} 
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={() => setShowAddStock(false)} disabled={submitting}>Hủy</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Lịch sử nhập hàng</h3>
              <button style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                <div className={styles.searchBox} style={{ flex: 1 }}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm theo sản phẩm, ghi chú hoặc người nhập..." 
                    value={historySearchText}
                    onChange={(e) => setHistorySearchText(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <button 
                  className={`${styles.btn} ${styles.btnPrimary}`} 
                  onClick={handleExportExcel}
                  disabled={filteredLogs.length === 0}
                  title="Xuất dữ liệu ra file Excel"
                >
                  Xuất Excel
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>Không tìm thấy lịch sử nhập hàng nào.</div>
              ) : (
                <div className={styles.historyList}>
                  {filteredLogs.map(log => (
                    <div key={log.id} className={styles.historyItem}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{log.product?.name}</div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                          Người nhập: {log.user?.name || "Hệ thống"} {log.note && `- Ghi chú: ${log.note}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 16 }}>+{log.quantityAdded}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatTime(log.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
