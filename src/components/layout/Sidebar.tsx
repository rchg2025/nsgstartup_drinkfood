"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import styles from "./sidebar.module.css";

const navItems = [
  { href: "/dashboard", icon: "📊", label: "Tổng quan", roles: ["ADMIN", "CASHIER", "BARISTA"] },
  { href: "/dashboard/pos", icon: "🛒", label: "Tạo đơn (POS)", roles: ["ADMIN", "CASHIER"] },
  { href: "/dashboard/orders", icon: "📋", label: "Đơn hàng", roles: ["ADMIN", "CASHIER"] },
  { href: "/dashboard/kitchen", icon: "🍹", label: "Pha chế", roles: ["ADMIN", "BARISTA", "CASHIER"] },
  { href: "/dashboard/menu", icon: "🍔", label: "Quản lý Menu", roles: ["ADMIN"] },
  { href: "/dashboard/staff", icon: "👥", label: "Nhân viên", roles: ["ADMIN"] },
  { href: "/dashboard/profit", icon: "💰", label: "Doanh thu", roles: ["ADMIN"] },
  { href: "/dashboard/points", icon: "🎁", label: "Tích Điểm", roles: ["ADMIN"] },
  { href: "/dashboard/campaigns", icon: "📢", label: "Chiến dịch", roles: ["ADMIN"] },
  { href: "/dashboard/report", icon: "📈", label: "Thống kê Báo cáo", roles: ["ADMIN"] },
  { href: "/dashboard/logs", icon: "📝", label: "Nhật ký", roles: ["ADMIN"] },
  { href: "/dashboard/settings", icon: "⚙️", label: "Cấu hình", roles: ["ADMIN"] },
  { href: "/dashboard/chat", icon: "💬", label: "Trò chuyện", roles: ["ADMIN", "CASHIER", "BARISTA"] },
];

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  useEffect(() => {
    if (!role) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/notifications?role=${role}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data.slice(0, 10));
          setUnreadCount(data.filter((n: any) => !n.read).length);
        }

        if (role === "ADMIN" || role === "BARISTA" || role === "CASHIER") {
          const [pRes, prepRes, chatRes] = await Promise.all([
            fetch("/api/orders?status=PENDING"),
            fetch("/api/orders?status=PREPARING"),
            fetch("/api/chat/conversations")
          ]);
          const p = await pRes.json();
          const prep = await prepRes.json();
          const chatData = await chatRes.json();
          if (Array.isArray(p) && Array.isArray(prep)) {
             setActiveOrdersCount(p.length + prep.length);
          }
          if (Array.isArray(chatData)) {
             const newChatCount = chatData.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
             setUnreadChatCount(prev => {
               if (newChatCount > prev && pathname !== "/dashboard/chat") {
                 new Audio("https://raw.githubusercontent.com/rchg2025/nsgstartup_drinkfood/main/src/lib/tingtingtinnhan.mp3").play().catch(() => {});
               }
               return newChatCount;
             });
          }
        }
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    
    // Heartbeat ping every 1 minute
    const pingHeartbeat = () => {
      fetch("/api/ping").catch(() => {});
    };
    pingHeartbeat();
    const pingInterval = setInterval(pingHeartbeat, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(pingInterval);
    };
  }, [role, pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getRoleLabel = (r: string) => {
    if (r === "ADMIN") return "Quản trị viên";
    if (r === "CASHIER") return "Thu ngân";
    if (r === "BARISTA") return "Pha chế";
    return r;
  };

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
    if (!isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
  };

  const handleMenuClick = (itemLabel: string) => {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "Truy cập Menu",
        details: `Nhân viên truy cập màn hình: ${itemLabel}`
      })
    }).catch(() => {});
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      {/* Toggle Button */}
      <button className={styles.toggleBtn} onClick={toggleSidebar}>
        {isCollapsed ? "❯" : "❮"}
      </button>

      {/* Brand Logo */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🧋</span>
        <div>
          <span className={styles.logoText}>NSG STARTUP</span>
          <span className={styles.logoSub}>v1.0</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              onClick={() => handleMenuClick(item.label)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.href === "/dashboard/kitchen" && activeOrdersCount > 0 && (
                <span className={styles.navBadge} style={{ background: "var(--red)" }}>
                  {activeOrdersCount}
                </span>
              )}
              {item.href === "/dashboard/chat" && unreadChatCount > 0 && (
                <span className={styles.navBadge} style={{ background: "var(--purple)" }}>
                  {unreadChatCount}
                </span>
              )}
              {isActive && <span className={styles.activeDot} />}
            </Link>
          );
        })}

        {/* Mobile Only: User Info and Logout */}
        <div className={`${styles.navItem} ${styles.mobileOnlyShow}`} style={{ pointerEvents: 'none' }}>
          <span className={styles.navIcon}>👤</span>
          <span className={styles.navLabel}>{session?.user?.name || "Tài khoản"}</span>
        </div>
        <button
          className={`${styles.navItem} ${styles.mobileOnlyShow}`}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <span className={styles.navIcon} style={{ color: 'var(--red)' }}>↪</span>
          <span className={styles.navLabel} style={{ color: 'var(--red)' }}>Đăng xuất</span>
        </button>
      </nav>

      {/* Bottom section */}
      <div className={styles.bottom}>
        {/* Notification Bell */}
        <div className={styles.notifWrap} ref={notifRef}>
          <button
            className={styles.notifBtn}
            onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}
            title="Thông báo"
          >
            <span>🔔</span>
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className={styles.notifPanel}>
              <div className={styles.notifHeader}>
                <span>Thông báo</span>
                <button onClick={markAllRead} className={styles.markReadBtn}>Đọc tất cả</button>
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>Không có thông báo</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`${styles.notifItem} ${!n.read ? styles.unread : ""}`}>
                      <div className={styles.notifTitle}>{n.title}</div>
                      <div className={styles.notifMsg}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className={styles.user}>
          <div className={styles.userAvatar}>
            {session?.user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session?.user?.name}</span>
            <span className={styles.userRole}>{getRoleLabel(role)}</span>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Đăng xuất"
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}
