"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatCurrency, formatTime, getStatusLabel, getStatusColor } from "@/lib/utils";
import { playNewOrder, playStatusChange, playSuccess } from "@/lib/audio";
import styles from "./page.module.css";

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersRes] = await Promise.all([
          fetch("/api/orders?limit=8"),
        ]);
        const orders = await ordersRes.json();
        setRecentOrders(orders);

        if (role === "ADMIN") {
          const statsRes = await fetch(`/api/stats?period=${period}`);
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (role) fetchData();
  }, [role, period]);

  // Real-time synchronization
  useEffect(() => {
    const eventSource = new EventSource("/api/sync");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "update" && data.changes) {
          // Play sounds
          const changes: any[] = data.changes || [];
          const hasNewOrder = changes.some((o: any) => o.status === "PENDING");
          const hasReady = changes.some((o: any) => o.status === "READY");
          const hasCompleted = changes.some((o: any) => o.status === "COMPLETED");
          const hasOtherChange = changes.some((o: any) => o.status === "PREPARING");

          if (hasNewOrder) playNewOrder();
          else if (hasReady || hasCompleted) playSuccess();
          else if (hasOtherChange) playStatusChange();

          // Refresh dashboard data softly
          if (role) {
             fetch("/api/orders?limit=8").then(r => r.json()).then(setRecentOrders);
             if (role === "ADMIN") {
               fetch(`/api/stats?period=${period}`).then(r => r.json()).then(setStats);
             }
          }
        }
      } catch (e) {}
    };
    return () => eventSource.close();
  }, [role, period]);

  const maxRevenue = stats?.last7Days
    ? Math.max(...stats.last7Days.map((d: any) => d.revenue), 1)
    : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {role === "BARISTA" ? "🍹 Màn hình pha chế" : "📊 Tổng quan"}
          </h1>
          <p className="page-subtitle">
            Xin chào, <strong>{session?.user?.name}</strong>! Hôm nay là một ngày tuyệt vời 🎉
          </p>
        </div>
        {role === "ADMIN" && (
          <div className={styles.periodTabs}>
            {["today", "week", "month"].map((p) => (
              <button
                key={p}
                className={`${styles.periodTab} ${period === p ? styles.active : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p === "today" ? "Hôm nay" : p === "week" ? "7 ngày" : "Tháng này"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={styles.scrollableActions}>
        {(role === "ADMIN" || role === "CASHIER") && (
          <Link href="/dashboard/pos" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,107,53,0.05))", borderColor: "rgba(255,107,53,0.3)" }}>
            <span className={styles.qaIcon}>🛒</span>
            <span className={styles.qaLabel}>Tạo đơn mới</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
        )}
        {(role === "ADMIN" || role === "BARISTA") && (
          <Link href="/dashboard/kitchen" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))", borderColor: "rgba(139,92,246,0.3)" }}>
            <span className={styles.qaIcon}>🍹</span>
            <span className={styles.qaLabel}>Màn hình pha chế</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
        )}
        {(role === "ADMIN" || role === "CASHIER") && (
          <Link href="/dashboard/orders" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", borderColor: "rgba(59,130,246,0.3)" }}>
            <span className={styles.qaIcon}>📋</span>
            <span className={styles.qaLabel}>Quản lý đơn hàng</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
        )}
        {role === "ADMIN" && (
          <Link href="/dashboard/menu" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", borderColor: "rgba(16,185,129,0.3)" }}>
            <span className={styles.qaIcon}>🍔</span>
            <span className={styles.qaLabel}>Quản lý menu</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
        )}
        {/* Admin Quick Tabs */}
        {role === "ADMIN" && (
          <>
          <Link href="/dashboard/profit" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))", borderColor: "rgba(234, 179, 8, 0.3)" }}>
            <span className={styles.qaIcon}>💰</span>
            <span className={styles.qaLabel}>Doanh thu</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          <Link href="/dashboard/staff" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))", borderColor: "rgba(59, 130, 246, 0.3)" }}>
            <span className={styles.qaIcon}>👥</span>
            <span className={styles.qaLabel}>Nhân viên</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          <Link href="/dashboard/points" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            <span className={styles.qaIcon}>🎁</span>
            <span className={styles.qaLabel}>Tích điểm</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          <Link href="/dashboard/campaigns" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))", borderColor: "rgba(236, 72, 153, 0.3)" }}>
            <span className={styles.qaIcon}>📢</span>
            <span className={styles.qaLabel}>Chiến dịch</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          <Link href="/dashboard/report" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))", borderColor: "rgba(16, 185, 129, 0.3)" }}>
            <span className={styles.qaIcon}>📈</span>
            <span className={styles.qaLabel}>Thống kê - Báo cáo</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          <Link href="/dashboard/settings" className={styles.quickAction} style={{ background: "linear-gradient(135deg, rgba(107, 114, 128, 0.15), rgba(107, 114, 128, 0.05))", borderColor: "rgba(107, 114, 128, 0.3)" }}>
            <span className={styles.qaIcon}>⚙️</span>
            <span className={styles.qaLabel}>Cấu hình</span>
            <span className={styles.qaArrow}>→</span>
          </Link>
          </>
        )}
      </div>

      {/* Admin Stats */}
      {role === "ADMIN" && (
        <>
          {loading ? (
            <div className={styles.loadingGrid}>
              {[1,2,3,4].map(i => <div key={i} className={styles.loadingSkeleton} />)}
            </div>
          ) : (
            <>
              <div className={`grid ${styles.statsGrid}`} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(255,107,53,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>💰</div>
                  <div className="stat-value" style={{ color: "var(--accent)", fontSize: 24 }}>
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                  <div className="stat-label">Doanh thu</div>
                </div>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(59,130,246,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>📦</div>
                  <div className="stat-value" style={{ color: "var(--blue)", fontSize: 24 }}>
                    {stats?.totalOrders || 0}
                  </div>
                  <div className="stat-label">Tổng đơn</div>
                </div>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>✅</div>
                  <div className="stat-value" style={{ color: "var(--green)", fontSize: 24 }}>
                    {stats?.ordersByStatus?.find((s: any) => s.status === "COMPLETED")?._count || 0}
                  </div>
                  <div className="stat-label">Hoàn thành</div>
                </div>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(245,158,11,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>⏳</div>
                  <div className="stat-value" style={{ color: "var(--yellow)", fontSize: 24 }}>
                    {(stats?.ordersByStatus?.find((s: any) => s.status === "PENDING")?._count || 0) +
                     (stats?.ordersByStatus?.find((s: any) => s.status === "PREPARING")?._count || 0)}
                  </div>
                  <div className="stat-label">Đang xử lý</div>
                </div>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(16,185,129,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>💎</div>
                  <div className="stat-value" style={{ color: "var(--green)", fontSize: 24 }}>
                    {formatCurrency(stats?.netProfit || 0)}
                  </div>
                  <div className="stat-label">Lợi nhuận ròng</div>
                </div>
                <div className="stat-card" style={{ padding: "16px" }}>
                  <div className="stat-icon" style={{ background: "rgba(139,92,246,0.15)", width: 40, height: 40, fontSize: 18, marginBottom: 12 }}>💸</div>
                  <div className="stat-value" style={{ color: "var(--purple)", fontSize: 24 }}>
                    {formatCurrency(stats?.totalCommission || 0)}
                  </div>
                  <div className="stat-label">Tổng hoa hồng</div>
                </div>
              </div>

              {/* Charts row */}
              <div className={`grid grid-2 ${styles.chartsRow}`}>
                {/* Revenue Chart */}
                <div className="card">
                  <h3 className={styles.cardTitle}>📈 Doanh thu 7 ngày qua</h3>
                  <div className="chart-bar-container" style={{ marginTop: 24 }}>
                    {stats?.last7Days?.map((day: any) => (
                      <div key={day.date} className="chart-bar-wrap">
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>
                          {formatCurrency(day.revenue)}
                        </span>
                        <div
                          className="chart-bar"
                          style={{
                            height: `${Math.max((day.revenue / maxRevenue) * 80, 4)}px`,
                            opacity: day.revenue === 0 ? 0.3 : 1,
                          }}
                        />
                        <span className="chart-bar-label">
                          {new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="card">
                  <h3 className={styles.cardTitle}>🏆 Top sản phẩm bán chạy</h3>
                  <div className={styles.topProductsList}>
                    {stats?.topProducts?.slice(0, 5).map((tp: any, i: number) => (
                      <div key={tp.productId} className={styles.topProductItem}>
                        <span className={styles.topProductRank}>#{i + 1}</span>
                        <span className={styles.topProductName}>{tp.product?.name || "Sản phẩm"}</span>
                        <span className={styles.topProductQty}>{tp._sum?.quantity || 0} ly</span>
                        <span className={styles.topProductRevenue}>{formatCurrency(tp._sum?.totalPrice || 0)}</span>
                      </div>
                    ))}
                    {(!stats?.topProducts || stats.topProducts.length === 0) && (
                      <div className="empty-state" style={{ padding: "20px 0" }}>
                        <div className="empty-state-desc">Chưa có dữ liệu</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Recent Orders */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.cardTitle}>🕐 Đơn hàng gần đây</h3>
          <Link href="/dashboard/orders" className="btn btn-ghost btn-sm">Xem tất cả →</Link>
        </div>
        {loading ? (
          <div className={styles.loadingSkeleton} style={{ height: 200 }} />
        ) : recentOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Chưa có đơn hàng nào</div>
            <div className="empty-state-desc">Hãy tạo đơn hàng đầu tiên!</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Số đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Giờ tạo</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>#{order.orderNumber}</strong></td>
                    <td>
                      {order.customerName
                        ? order.customerName
                        : order.customerPhone
                        ? "Khách"
                        : "Khách lẻ"}
                    </td>
                    <td style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {formatCurrency(order.finalAmount)}
                    </td>
                    <td>
                      <span className={`badge badge-${order.status.toLowerCase()}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {formatTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
