"use client";
import { useEffect, useState, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./PublicOrdering.module.css";

interface Product {
  id: string;
  name: string;
  price: number;
  retailPrice?: number;
  image?: string;
  available: boolean;
  category: { id: string; name: string; icon: string };
  sizes: { id: string; name: string; priceAdd: number }[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Topping {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  product: Product;
  sizeName?: string;
  sizePrice: number;
  quantity: number;
  toppings: { topping: Topping; price: number }[];
  note?: string;
  unitPrice: number;
  totalPrice: number;
}

export default function PublicOrdering({
  fixedCustomerType,
  hideCustomerSelection = false
}: {
  fixedCustomerType?: "HSSV" | "RETAIL";
  hideCustomerSelection?: boolean;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerType, setCustomerType] = useState<"HSSV" | "RETAIL" | null>(fixedCustomerType || null); // HSSV or RETAIL
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(!hideCustomerSelection);
  const [showCustomerTypeModal, setShowCustomerTypeModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [bankSettings, setBankSettings] = useState<any>(null);
  
  // Cart state 
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState("");
  const [modalToppings, setModalToppings] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState("");
  const [modalQty, setModalQty] = useState(1);

  // Discount & Campaigns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  // Auto-scroll campaign slider
  const campaignScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (campaigns.length <= 1) return;
    const interval = setInterval(() => {
      const el = campaignScrollRef.current;
      if (el) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: el.clientWidth > 300 ? 300 : el.clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [campaigns]);

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: string; value: number; rewardId: string } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Campaign Redeem Modal
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<any>(null);

  // Song Request state
  const [isSongRequestOpen, setIsSongRequestOpen] = useState(false);
  const [srMessage, setSrMessage] = useState("");
  const [srSongName, setSrSongName] = useState("");
  const [srRequester, setSrRequester] = useState("");
  const [srHasTip, setSrHasTip] = useState(false);
  const [srTipAmount, setSrTipAmount] = useState<number | "other" | "">("");
  const [srOtherTipAmount, setSrOtherTipAmount] = useState<number | "">("");
  const [submittingSr, setSubmittingSr] = useState(false);
  const [srSuccess, setSrSuccess] = useState(false);
  const [srActiveTab, setSrActiveTab] = useState<"create" | "list">("create");
  const [srList, setSrList] = useState<any[]>([]);
  const [srLoading, setSrLoading] = useState(false);

  const fetchPublicSongRequests = async () => {
    setSrLoading(true);
    try {
      const res = await fetch("/api/public/song-requests");
      const data = await res.json();
      setSrList(data);
    } catch (e) {
      console.error(e);
    }
    setSrLoading(false);
  };

  useEffect(() => {
    if (isSongRequestOpen && srActiveTab === "list") {
      fetchPublicSongRequests();
    }
  }, [isSongRequestOpen, srActiveTab]);

  // Point lookup state
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");
  const [pointLogsPage, setPointLogsPage] = useState(1);

  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "points") {
        setIsPointModalOpen(true);
        // Clean up URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const fetchData = async () => {
      try {
        const [menuRes, tablesRes] = await Promise.all([
          fetch("/api/public/menu-data", { next: { revalidate: 60 } }),
          fetch("/api/public/tables")
        ]);

        const data = await menuRes.json();
        
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setToppings(data.toppings || []);
        setBankSettings(data.settings || {});
        if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns);

        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          tablesData.sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
          setTables(tablesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category.id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openProductModal = (product: Product) => {
    if (cart.length === 0 && !customerType) {
      setPendingProduct(product);
      setShowCustomerTypeModal(true);
      return;
    }
    openModalForProduct(product);
  };

  const openModalForProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalSize(product?.sizes?.[0]?.name || "");
    setModalToppings([]);
    setModalNote("");
    setModalQty(1);
  };

  const selectCustomerTypeAndContinue = async (type: "HSSV" | "RETAIL") => {
    if (type === "HSSV") {
      const session = await getSession();
      if (!session) {
        router.push("/login");
        return;
      }
    }
    setCustomerType(type);
    setShowCustomerTypeModal(false);
    if (pendingProduct) {
      openModalForProduct(pendingProduct);
      setPendingProduct(null);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const size = selectedProduct.sizes?.find((s) => s.name === modalSize);
    const sizePrice = size?.priceAdd || 0;
    const selectedToppingObjs = toppings.filter((t) => modalToppings.includes(t.id));
    const toppingTotal = selectedToppingObjs.reduce((sum, t) => sum + t.price, 0);
    const basePrice = customerType === "RETAIL" ? (selectedProduct.retailPrice || selectedProduct.price) : selectedProduct.price;
    const unitPrice = basePrice + sizePrice + toppingTotal;
    const newItem: CartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      sizeName: modalSize || undefined,
      sizePrice,
      quantity: modalQty,
      toppings: selectedToppingObjs.map((t) => ({ topping: t, price: t.price })),
      note: modalNote || undefined,
      unitPrice,
      totalPrice: unitPrice * modalQty,
    };
    setCart((prev) => [...prev, newItem]);
    setSelectedProduct(null);
  };

  useEffect(() => {
    setCart(prev => prev.map(item => {
      const basePrice = customerType === "RETAIL" ? (item.product.retailPrice || item.product.price) : item.product.price;
      const toppingTotal = item.toppings.reduce((sum, t) => sum + t.price, 0);
      const newUnitPrice = basePrice + item.sizePrice + toppingTotal;
      return {
        ...item,
        unitPrice: newUnitPrice,
        totalPrice: newUnitPrice * item.quantity
      };
    }));
  }, [customerType]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta, totalPrice: item.unitPrice * (item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));

  const totalRawAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === "FIXED_AMOUNT") {
      discountAmount = appliedDiscount.value;
    } else if (appliedDiscount.type === "PERCENTAGE") {
      discountAmount = (totalRawAmount * appliedDiscount.value) / 100;
    }
  }
  const finalAmount = Math.max(0, totalRawAmount - discountAmount);

  const handleValidateDiscount = async () => {
    if (!discountCodeInput) return;
    setValidatingDiscount(true);
    try {
      const res = await fetch("/api/public/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone, code: discountCodeInput })
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedDiscount({ code: discountCodeInput, type: data.discountType, value: data.discountValue, rewardId: data.rewardId });
        alert(`Đã áp dụng mã: ${data.campaignName}`);
      } else {
        alert("Lỗi: " + data.error);
        setAppliedDiscount(null);
      }
    } catch {
      alert("Lỗi kết nối");
    }
    setValidatingDiscount(false);
  };

  const handleApplyRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !redeemPhone) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/public/campaigns/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: redeemPhone, campaignId: selectedCampaign.id })
      });
      const data = await res.json();
      if (res.ok) {
        setRedeemResult(data);
      } else {
        alert("Lỗi: " + data.error);
      }
    } catch {
      alert("Lỗi kết nối mạng");
    }
    setRedeeming(false);
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (customerType === "RETAIL" && !selectedTable) {
      alert("Vui lòng chọn bàn trước khi đặt món.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerType: customerType,
          totalAmount: totalRawAmount,
          discount: discountAmount,
          finalAmount: finalAmount,
          paymentMethod,
          paymentStatus: "PENDING", // Khách đặt luôn là PENDING
          note: orderNote || null,
          tableId: selectedTable?.id || null,
          tableName: selectedTable?.name || null,
          usedDiscountCodeId: appliedDiscount?.rewardId || null,
          items: cart.map((item) => ({
            productId: item.product.id,
            sizeName: item.sizeName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            note: item.note,
            toppings: item.toppings.map((t) => ({
              toppingId: t.topping.id,
              price: t.price,
            })),
          })),
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setSuccessOrder(order);
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerType(null);
        setDiscountCodeInput("");
        setAppliedDiscount(null);
        setIsCartOpen(false);
      } else {
        alert("Có lỗi xảy ra, vui lòng thử lại!");
      }
    } catch (err) {
      alert("Mất kết nối, vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePointLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch(`/api/public/points?phone=${lookupPhone}`);
      const data = await res.json();
      if (res.ok) {
        setLookupResult(data);
        setPointLogsPage(1);
      } else {
        setLookupResult(null);
        setLookupError(data.error || "Không tìm thấy khách hàng.");
      }
    } catch {
      setLookupError("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLookupLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f4f6fa" }}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ borderColor: "#e5e7eb", borderTopColor: "var(--purple)", borderWidth: "4px", borderStyle: "solid", borderRadius: "50%", width: "48px", height: "48px", animation: "spin 1s linear infinite" }}></div>
        <div style={{ marginTop: "24px", fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>Đang tải thực đơn...</div>
      </div>
    );
  }

  const handleSubmitSongRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srMessage.trim()) return alert("Vui lòng nhập cảm nghĩ hoặc câu chuyện của bạn!");
    
    setSubmittingSr(true);
    let finalTipAmount = 0;
    if (srHasTip) {
      if (srTipAmount === "other") {
        finalTipAmount = Number(srOtherTipAmount) || 0;
      } else {
        finalTipAmount = Number(srTipAmount) || 0;
      }
    }

    try {
      const res = await fetch("/api/song-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: srMessage,
          songName: srSongName,
          requesterName: srRequester,
          hasTip: srHasTip,
          tipAmount: finalTipAmount,
        }),
      });
      if (res.ok) {
        setSrSuccess(true);
      } else {
        const data = await res.json();
        alert("Lỗi: " + data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
    setSubmittingSr(false);
  };


  return (
    <div className={styles.posLayout}>
      {/* ===== LEFT: Menu Panel ===== */}
      <div className={styles.menuPanel}>
        <div className={styles.menuHeader}>
          <div className={styles.brandName} style={{ cursor: "pointer" }} onClick={() => window.location.reload()}>
            <div className={styles.brandIcon}>🍹</div>
            <span className={styles.brandNameText}>NSGSTARTUP MENU</span>
          </div>
          <div className={styles.headerActions} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button 
              className={styles.sizeBtn} 
              style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "var(--primary)", border: "1px solid var(--primary)", background: "rgba(239, 68, 68, 0.05)" }}
              onClick={() => {
                window.location.href = '/song-request';
              }}
            >
              🎵 Yêu cầu bài hát
            </button>
            <button 
              className={styles.sizeBtn} 
              style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: "var(--purple)", border: "1px solid var(--purple)", background: "rgba(102, 51, 153, 0.05)" }}
              onClick={() => { setIsPointModalOpen(true); setLookupResult(null); setLookupPhone(""); setLookupError(""); }}
            >
              🎁 Tra Điểm
            </button>
            <a href="/login" style={{ fontSize: "14px", fontWeight: 600, color: "#8c93a1", textDecoration: "none", display: "flex", alignItems: "center" }} title="Đăng nhập quản trị">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </a>
          </div>
        </div>

        {/* Categories */}
        <div className={styles.categories}>
          <button
            className={`${styles.catBtn} ${selectedCategory === "all" ? styles.active : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${selectedCategory === cat.id ? styles.active : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span> {cat.name} ({products.filter(p => p.category.id === cat.id).length})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Bạn muốn uống gì hôm nay?..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={styles.productCard}
              onClick={() => openProductModal(product)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.productImg}>
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <span className={styles.productEmoji}>🧋</span>
                )}
              </div>
              <div className={styles.productInfo}>
                <div className={styles.productName}>{product.name}</div>
                <div className={styles.productPrice}>
                  {customerType 
                    ? formatCurrency(customerType === "RETAIL" ? (product.retailPrice || product.price) : product.price) 
                    : ""}
                </div>
              </div>
              <div className={styles.addBtn}>+</div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className={styles.emptyProducts}>
              <div className={styles.emptyIcon}>📦</div>
              <div className={styles.emptyText}>Chưa có món nào.</div>
            </div>
          )}
        </div>

        {/* Campaign Slider */}
        {campaigns.length > 0 && (
          <div style={{ padding: "0 32px 24px", marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#1a1a24" }}>🔥 Chiến dịch Đổi Điểm</h3>
            </div>
            <div ref={campaignScrollRef} style={{ display: "flex", gap: "16px", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: "10px", scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <style>{`
                div::-webkit-scrollbar { display: none; }
              `}</style>
              {campaigns.map((camp) => (
                <div key={camp.id} className={styles.productCard} style={{ flexShrink: 0, width: "calc(100vw - 64px)", maxWidth: "320px", scrollSnapAlign: "start" }} onClick={() => setSelectedCampaign(camp)}>
                  <div className={styles.productImg} style={{ background: "linear-gradient(135deg, rgba(82, 34, 208, 0.1), rgba(255, 107, 53, 0.1))", fontSize: 32 }}>
                    {camp.bannerImage ? (
                      <img src={camp.bannerImage} alt={camp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      camp.rewardType === "GIFT" ? "🎁" : "🎟️"
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <div className={styles.productName}>{camp.name}</div>
                    <div className={styles.productPrice} style={{ color: "#2563eb", fontSize: "14px" }}>
                       {camp.pointsRequired} điểm
                    </div>
                    <div style={{ fontSize: "12px", color: "#5c6275", marginTop: 2 }}>
                      {camp.rewardType === "GIFT" 
                        ? `Quà: ${camp.giftName}` 
                        : `Giảm: ${camp.discountType === "FIXED_AMOUNT" ? formatCurrency(camp.discountValue) : camp.discountValue + "%"}`}
                    </div>
                    {camp.rewardType === "DISCOUNT" && camp.endDate && (
                      <div style={{ fontSize: "11px", color: "var(--red)", marginTop: 2, fontWeight: 500 }}>
                        HSD Voucher: {new Date(new Date(camp.endDate).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")}
                      </div>
                    )}
                  </div>
                  <div className={styles.addBtn} style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)", boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)" }}>
                    ›
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== RIGHT: Cart Panel (Drawer) ===== */}
      <div className={`${styles.cartPanel} ${isCartOpen ? styles.open : ""}`}>
        <div className={styles.cartHeader}>
          <h2 className={styles.cartTitle}>
            Đơn của bạn <span className={styles.cartBadge}>{totalItems}</span>
          </h2>
          <button className={styles.closeCartMobile} onClick={() => setIsCartOpen(false)}>
            ✕
          </button>
        </div>

        {/* Customer Info */}
        <div className={styles.customerInfo}>
          <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 500, marginBottom: 12, lineHeight: 1.4, padding: "8px", background: "rgba(var(--primary-rgb), 0.05)", borderRadius: "8px", border: "1px solid rgba(var(--primary-rgb), 0.1)" }}>
            ✨ Nhập thông tin cá nhân (số điện thoại) để được tích điểm và hưởng các chính sách ưu đãi của chúng tôi.
          </div>
          <input
            className={styles.customerInput}
            placeholder="👤 Tên của bạn (Tùy chọn)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className={styles.customerInput}
            placeholder="📱 Số điện thoại (Tùy chọn)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>



        {/* Cart Items & Payment Info */}
        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}>
              <div className={styles.cartEmptyIcon}>🧺</div>
              <div className={styles.cartEmptyText}>Chưa có món nào</div>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <div className={styles.cartItemName}>{item.product.name}</div>
                    <div className={styles.cartItemMeta}>
                      {item.sizeName && <span className={styles.cartItemTag}>{item.sizeName}</span>}
                      {item.toppings.map((t) => (
                        <span key={t.topping.id} className={styles.cartItemTag}>
                          {t.topping.name}
                        </span>
                      ))}
                    </div>
                    {item.note && <div className={styles.cartItemNote}>📝 {item.note}</div>}
                  </div>
                  <div className={styles.cartItemRight}>
                    <div className={styles.cartItemPrice}>{formatCurrency(item.totalPrice)}</div>
                    <div className={styles.qtyControl}>
                      <button onClick={() => updateQty(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ padding: "16px 0", borderTop: "2px dashed #edf0f5", marginTop: "8px" }}>
                
                {/* Discount input box */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                   <input
                     className="form-input"
                     style={{ flex: 1, marginBottom: 0, fontSize: 14 }}
                     placeholder="Nhập mã giảm giá..."
                     value={discountCodeInput}
                     onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                     disabled={!!appliedDiscount || validatingDiscount}
                   />
                   {appliedDiscount ? (
                     <button className="btn btn-secondary" onClick={() => setAppliedDiscount(null)} style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "none" }}>
                       Hủy
                     </button>
                   ) : (
                     <button className="btn btn-primary" onClick={handleValidateDiscount} disabled={validatingDiscount || !discountCodeInput}>
                       {validatingDiscount ? "Đang dò..." : "Áp dụng"}
                     </button>
                   )}
                </div>

                {customerType === "RETAIL" && tables.length > 0 && (
                  <div style={{ marginBottom: 16, padding: "12px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Vị trí bàn của bạn: <span style={{ color: "red" }}>*</span></div>
                    
                    {Array.from(new Set(tables.map(t => t.zone))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((zone, index, arr) => (
                      <div key={zone} style={{ marginBottom: index === arr.length - 1 ? 0 : 12, borderBottom: index === arr.length - 1 ? "none" : "1px dashed #e2e8f0", paddingBottom: index === arr.length - 1 ? 0 : 12 }}>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 500 }}>{zone}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {tables.filter(t => t.zone === zone).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(table => (
                            <div 
                              key={table.id}
                              onClick={() => setSelectedTable(table)}
                              style={{ 
                                padding: "12px", 
                                border: selectedTable?.id === table.id ? "2px solid #ef4444" : "1px solid #e2e8f0", 
                                borderRadius: 8, 
                                background: selectedTable?.id === table.id ? "rgba(239, 68, 68, 0.1)" : "#fff",
                                cursor: "pointer",
                                flex: "1 1 80px",
                                maxWidth: "100px",
                                textAlign: "center",
                                transition: "all 0.2s",
                                transform: selectedTable?.id === table.id ? "scale(1.02)" : "scale(1)",
                                boxShadow: selectedTable?.id === table.id ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "none",
                              }}
                            >
                              <div style={{ fontSize: 24, marginBottom: 4 }}>🪑</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: selectedTable?.id === table.id ? "#ef4444" : "var(--text)" }}>{table.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`${styles.cartRow}`} style={{ paddingBottom: 8 }}>
                  <span>Tạm tính:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(totalRawAmount)}</span>
                </div>
                {appliedDiscount && (
                  <div className={`${styles.cartRow}`} style={{ paddingBottom: 8, color: "var(--red)" }}>
                    <span>Chiết khấu ({appliedDiscount.code}):</span>
                    <span style={{ fontWeight: 600 }}>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className={`${styles.cartRow} ${styles.total}`}>
                  <span>Tổng tiền:</span>
                  <span className={styles.totalAmount}>{formatCurrency(finalAmount)}</span>
                </div>

                <div className={styles.paymentMethods}>
                  {["CASH", "TRANSFER", "CARD"].map((method) => (
                    <button
                      key={method}
                      className={`${styles.payMethod} ${paymentMethod === method ? styles.payActive : ""}`}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <span>{method === "CASH" ? "💵" : method === "TRANSFER" ? "🏦" : "💳"}</span>
                      {method === "CASH" ? "Tiền mặt" : method === "TRANSFER" ? "Chuyển khoản" : "Quẹt thẻ"}
                    </button>
                  ))}
                </div>

                {paymentMethod === "TRANSFER" && bankSettings?.bank_code && bankSettings?.bank_account && (
                  <div style={{ textAlign: "center", marginBottom: "20px", padding: "16px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <p style={{ fontWeight: 600, color: "var(--red)", marginBottom: 12, fontSize: 13 }}>Quét mã để thanh toán (Hoặc hiển thị lại sau khi đặt)</p>
                    <img
                      src={`https://img.vietqr.io/image/${bankSettings.bank_code}-${bankSettings.bank_account}-compact2.png?amount=${finalAmount}&addInfo=Thanh toan don hang NSGSTARTUP ${new Date().toLocaleDateString("vi-VN").replace(/\//g, "")}`}
                      alt="VietQR"
                      style={{ width: "200px", height: "200px", objectFit: "contain", margin: "0 auto", display: "block" }}
                    />
                    <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 12 }}>{bankSettings.bank_account_name}</div>
                    <div style={{ fontWeight: 600, color: "#ef4444" }}>{bankSettings.bank_account} - {bankSettings.bank_code}</div>
                    
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                      <button 
                        type="button"
                        onClick={async () => {
                          const url = `https://img.vietqr.io/image/${bankSettings.bank_code}-${bankSettings.bank_account}-compact2.png?amount=${finalAmount}&addInfo=Thanh toan don hang NSGSTARTUP ${new Date().toLocaleDateString("vi-VN").replace(/\//g, "")}`;
                          try {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = "QR_ThanhToan_DonHang.png";
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(blobUrl);
                            document.body.removeChild(a);
                          } catch (e) {
                            console.error("Lỗi khi tải ảnh, mở sang tab mới", e);
                            window.open(url, "_blank");
                          }
                        }}
                        style={{ padding: "8px 16px", borderRadius: 8, background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 13, border: "1px solid #cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        ⬇️ Tải mã QR về máy
                      </button>
                    </div>
                  </div>
                )}



                <textarea
                  className={styles.orderNoteInput}
                  placeholder="Ghi chú thêm cho quán (ít đá, nhiều đường...)"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        {/* Cart Footer (Sticky Button only) */}
        <div className={styles.cartFooter}>
          <button
            id="submit-order-btn"
            className={styles.submitBtn}
            onClick={handleSubmitOrder}
            disabled={submitting || cart.length === 0}
          >
            {submitting ? (
              "⏳ Đang gửi đơn..."
            ) : (
              <>🚀 Đặt Hàng Ngay {cart.length > 0 ? `· ${formatCurrency(finalAmount)}` : ""}</>
            )}
          </button>
        </div>
      </div>

      {/* Floating Cart Button */}
      {!isCartOpen && (
        <button 
          className={`${styles.mobileCartBtn} ${cart.length > 0 ? styles.hasItems : ""}`}
          onClick={() => setIsCartOpen(true)}
          title="Mở giỏ hàng"
        >
          <span>🛒</span>
          {totalItems > 0 && <span className={styles.cartBadgeFloat}>{totalItems}</span>}
        </button>
      )}

      {/* ===== Overlay for Cart ===== */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)} style={{ zIndex: 150 }}></div>
      )}

      {/* ===== Welcome Modal ===== */}
      {showWelcomeModal && (
        <div className="modal-overlay" style={{ zIndex: 400 }}>
          <div className="modal" style={{ maxWidth: 450, textAlign: "center", padding: "40px 20px" }}>
            <h2 className="modal-title" style={{ fontSize: "24px", fontWeight: 800, marginBottom: 12 }}>Xin chào Quý khách!</h2>
            <p style={{ color: "#5c6275", marginBottom: 32, fontSize: 16 }}>
              Vui lòng chọn dịch vụ bạn muốn sử dụng hôm nay.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                className={styles.submitBtn}
                style={{ padding: "16px", fontSize: "16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 10px rgba(16, 185, 129, 0.3)", justifyContent: "center" }}
                onClick={() => { setShowWelcomeModal(false); if (!hideCustomerSelection) setShowCustomerTypeModal(true); }}
              >
                🛒 Bắt đầu Đặt món
              </button>
              <button
                className={styles.submitBtn}
                style={{ padding: "16px", fontSize: "16px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", boxShadow: "0 4px 10px rgba(239, 68, 68, 0.3)", justifyContent: "center" }}
                onClick={() => { window.location.href = '/song-request'; }}
              >
                🎵 Yêu cầu Bài hát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Customer Type Selection Modal ===== */}
      {showCustomerTypeModal && !hideCustomerSelection && (
        <div className="modal-overlay" style={{ zIndex: 350 }} onClick={() => !customerType ? null : setShowCustomerTypeModal(false)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "20px", justifyContent: "center" }}>
              <h2 className="modal-title" style={{ fontSize: "20px", fontWeight: 800 }}>Vui lòng chọn loại khách hàng</h2>
              {customerType && <button className="modal-close" onClick={() => setShowCustomerTypeModal(false)}>✕</button>}
            </div>
            <p style={{ color: "#5c6275", marginBottom: 24, fontSize: 15 }}>
              Bạn đang tạo đơn hàng mới. Vui lòng chọn đối tượng khách hàng để áp dụng mức giá cho đơn hàng này.
            </p>
            <div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
              <button
                className={styles.submitBtn}
                style={{ flex: 1, background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)", boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)", padding: "12px 8px", fontSize: "14px" }}
                onClick={() => selectCustomerTypeAndContinue("HSSV")}
              >
                🎓 HSSV
              </button>
              <button
                className={styles.submitBtn}
                style={{ flex: 1, background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)", boxShadow: "0 4px 10px rgba(249, 115, 22, 0.3)", padding: "12px 8px", fontSize: "14px" }}
                onClick={() => selectCustomerTypeAndContinue("RETAIL")}
              >
                🛍️ Khách hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Product Detail Modal ===== */}
      {selectedProduct && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setSelectedProduct(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h2 className="modal-title" style={{ fontSize: "24px", fontWeight: 800 }}>{selectedProduct.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>

            {selectedProduct.image && (
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name} 
                  style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} 
                />
              </div>
            )}

            {/* Size selection */}
            {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: "8px", display: "block" }}>Chọn size</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size.id}
                      className={`${styles.sizeBtn} ${modalSize === size.name ? styles.sizeActive : ""}`}
                      onClick={() => setModalSize(size.name)}
                    >
                      <div style={{ fontSize: "15px" }}>{size.name}</div>
                      {size.priceAdd > 0 && <div style={{ fontSize: "13px", opacity: 0.8 }}>+{formatCurrency(size.priceAdd)}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings */}
            {toppings.length > 0 && (
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: "8px", display: "block" }}>Topping (tùy chọn)</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {toppings.map((topping) => (
                    <button
                      key={topping.id}
                      className={`${styles.toppingBtn} ${modalToppings.includes(topping.id) ? styles.toppingActive : ""}`}
                      onClick={() =>
                        setModalToppings((prev) =>
                          prev.includes(topping.id)
                            ? prev.filter((id) => id !== topping.id)
                            : [...prev, topping.id]
                        )
                      }
                    >
                      {topping.name}
                      {topping.price > 0 && <span> +{formatCurrency(topping.price)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: "8px", display: "block" }}>Ghi chú</label>
              <input
                className={styles.orderNoteInput}
                style={{ width: "100%", boxSizing: "border-box", marginBottom: 0 }}
                placeholder="Ít đá, không đường..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
              />
            </div>

            {/* Qty + Add */}
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div className={styles.qtyControl} style={{ padding: "8px", borderRadius: "16px", background: "#f4f6fa" }}>
                <button style={{ width: "36px", height: "36px", fontSize: "18px" }} onClick={() => setModalQty(Math.max(1, modalQty - 1))}>−</button>
                <span style={{ minWidth: "24px", fontSize: "18px" }}>{modalQty}</span>
                <button style={{ width: "36px", height: "36px", fontSize: "18px" }} onClick={() => setModalQty(modalQty + 1)}>+</button>
              </div>
              <button
                className={styles.submitBtn}
                style={{ flex: 1, padding: "16px" }}
                onClick={addToCart}
              >
                Thêm vào giỏ · {formatCurrency(
                  ((customerType === "RETAIL" ? (selectedProduct.retailPrice || selectedProduct.price) : selectedProduct.price) +
                    (selectedProduct.sizes?.find((s) => s.name === modalSize)?.priceAdd || 0) +
                    toppings.filter((t) => modalToppings.includes(t.id)).reduce((s, t) => s + t.price, 0)) *
                    modalQty
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Success Modal ===== */}
      {successOrder && (
        <div className="modal-overlay" style={{ zIndex: 400 }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: "center", padding: "40px 30px" }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <h2 className="modal-title" style={{ marginBottom: 12, fontSize: "28px", fontWeight: 800 }}>
              Đặt hàng thành công!
            </h2>
            <p style={{ color: "#5c6275", marginBottom: 32, fontSize: 16, lineHeight: 1.5 }}>
              Mã đơn của bạn là <strong style={{ color: "#1a1a24", fontSize: "18px" }}>#{successOrder.orderNumber}</strong>.<br />
              Vui lòng theo dõi trạng thái đơn hàng.
            </p>

            {successOrder.paymentMethod === "TRANSFER" && bankSettings?.bank_code && bankSettings?.bank_account && (
              <div style={{ textAlign: "center", marginBottom: "24px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: 600, color: "var(--red)", marginBottom: 12 }}>Vui lòng quét mã QR dưới đây để thanh toán</p>
                <img
                  src={`https://img.vietqr.io/image/${bankSettings.bank_code}-${bankSettings.bank_account}-compact2.png?amount=${successOrder.finalAmount}&addInfo=Thanh toan don hang NSGSTARTUP voi ma don ${successOrder.orderNumber} ${new Date().toLocaleDateString("vi-VN").replace(/\//g, "")}`}
                  alt="VietQR"
                  style={{ width: "200px", height: "200px", objectFit: "contain", margin: "0 auto", display: "block" }}
                />
                <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 12 }}>{bankSettings.bank_account_name}</div>
                <div style={{ fontWeight: 600, color: "#ef4444" }}>{bankSettings.bank_account} - {bankSettings.bank_code}</div>
                
                <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
                  <button 
                    type="button"
                    onClick={async () => {
                      const url = `https://img.vietqr.io/image/${bankSettings.bank_code}-${bankSettings.bank_account}-compact2.png?amount=${successOrder.finalAmount}&addInfo=Thanh toan don hang NSGSTARTUP voi ma don ${successOrder.orderNumber} ${new Date().toLocaleDateString("vi-VN").replace(/\//g, "")}`;
                      try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = `QR_ThanhToan_Don_${successOrder.orderNumber}.png`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(blobUrl);
                        document.body.removeChild(a);
                      } catch (e) {
                        console.error("Lỗi khi tải ảnh, mở sang tab mới", e);
                        window.open(url, "_blank");
                      }
                    }}
                    style={{ padding: "8px 16px", borderRadius: 8, background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 13, border: "1px solid #cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    ⬇️ Tải mã QR về máy
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className={styles.submitBtn}
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  window.open(`/order-status/${successOrder.id}`, "_blank");
                  setSuccessOrder(null);
                }}
              >
                Xem trạng thái đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Point Lookup Modal ===== */}
      {isPointModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 400 }} onClick={() => setIsPointModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 800, height: "80vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h2 className="modal-title" style={{ fontSize: "20px", fontWeight: 800 }}>🎁 Tra Cứu Điểm</h2>
              <button className="modal-close" onClick={() => setIsPointModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handlePointLookup} style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, flexShrink: 0 }}>
              <input 
                type="tel"
                className={styles.customerInput}
                style={{ width: "100%", marginBottom: 0 }}
                placeholder="Nhập số điện thoại..."
                value={lookupPhone}
                onChange={e => setLookupPhone(e.target.value)}
                required
              />
              <button type="submit" className={styles.submitBtn} disabled={lookupLoading}>
                {lookupLoading ? "Đang tra..." : "Tra cứu"}
              </button>
            </form>

            {lookupError && (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--red)", background: "rgba(239, 68, 68, 0.1)", borderRadius: 8 }}>
                {lookupError === "Customer not found" ? "Số điện thoại này chưa được lưu trên hệ thống." : lookupError}
              </div>
            )}

            {lookupResult && (
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                <div style={{ padding: 16, background: "rgba(102, 51, 153, 0.1)", borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Khách hàng</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{lookupResult.name} · {lookupResult.phone}</div>
                  
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "white", padding: 12, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--purple)" }}>{lookupResult.currentPoints.toLocaleString("vi-VN")}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Điểm hiện tại</div>
                    </div>
                    <div style={{ flex: 1, background: "white", padding: 12, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{lookupResult.totalPoints.toLocaleString("vi-VN")}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Điểm tích lũy</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Lịch sử phần thưởng</div>
                {lookupResult.pointLogs?.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Chưa có lịch sử.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {lookupResult.pointLogs?.slice((pointLogsPage - 1) * 10, pointLogsPage * 10).map((log: any) => (
                        <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{log.note || (log.action === "EARN" ? "Tích điểm HĐ" : "Đổi Quà")}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                              {new Date(log.createdAt).toLocaleString("vi-VN")}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: log.action === "EARN" ? "var(--green)" : "var(--red)" }}>
                            {log.action === "EARN" ? "+" : "-"}{log.points.toLocaleString("vi-VN")}
                          </div>
                        </div>
                      ))}
                    </div>
                    {lookupResult.pointLogs?.length > 10 && (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 20 }}>
                        <button
                          type="button"
                          disabled={pointLogsPage === 1}
                          onClick={() => setPointLogsPage(p => Math.max(1, p - 1))}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 20,
                            border: "1px solid var(--border)",
                            background: pointLogsPage === 1 ? "#f5f5f5" : "white",
                            color: pointLogsPage === 1 ? "#aaa" : "var(--text-primary)",
                            cursor: pointLogsPage === 1 ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: 14
                          }}
                        >
                          Trước
                        </button>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                          Trang {pointLogsPage} / {Math.ceil(lookupResult.pointLogs.length / 10)}
                        </div>
                        <button
                          type="button"
                          disabled={pointLogsPage >= Math.ceil(lookupResult.pointLogs.length / 10)}
                          onClick={() => setPointLogsPage(p => p + 1)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 20,
                            border: "1px solid var(--border)",
                            background: pointLogsPage >= Math.ceil(lookupResult.pointLogs.length / 10) ? "#f5f5f5" : "white",
                            color: pointLogsPage >= Math.ceil(lookupResult.pointLogs.length / 10) ? "#aaa" : "var(--text-primary)",
                            cursor: pointLogsPage >= Math.ceil(lookupResult.pointLogs.length / 10) ? "not-allowed" : "pointer",
                            fontWeight: 600,
                            fontSize: 14
                          }}
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Campaign Redeem Modal ===== */}
      {selectedCampaign && (
        <div className="modal-overlay" style={{ zIndex: 400 }} onClick={() => !redeeming && setSelectedCampaign(null)}>
          <div className="modal" style={{ maxWidth: 480, display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h2 className="modal-title" style={{ fontSize: "20px", fontWeight: 800 }}>Mời bạn đổi VOUCHER</h2>
              <button className="modal-close" onClick={() => !redeeming && setSelectedCampaign(null)}>✕</button>
            </div>
            
            {!redeemResult ? (
              <form onSubmit={handleApplyRedeem} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                 <div style={{ background: "rgba(82, 34, 208, 0.05)", padding: 16, borderRadius: 12, display: "flex", gap: 16, alignItems: "center" }}>
                    {(selectedCampaign.bannerImage || selectedCampaign.giftImage) ? (
                      <img src={selectedCampaign.bannerImage || selectedCampaign.giftImage} alt="Reward" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 80, height: 80, background: "rgba(82, 34, 208, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>
                        {selectedCampaign.rewardType === "GIFT" ? "🎁" : "🎟️"}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedCampaign.name}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                         ⏰ Thời gian: {new Date(selectedCampaign.startDate).toLocaleDateString("vi-VN")} - {new Date(selectedCampaign.endDate).toLocaleDateString("vi-VN")}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
                         Cần <strong style={{ color: "var(--purple)" }}>{selectedCampaign.pointsRequired}</strong> điểm để đổi {selectedCampaign.rewardType === "GIFT" ? "phần quà này." : "mã giảm giá này."}
                      </div>
                      {selectedCampaign.rewardType === "DISCOUNT" && selectedCampaign.endDate && (
                        <div style={{ fontSize: 13, marginTop: 8, color: "var(--red)", fontWeight: 500 }}>
                          ⏳ Lưu ý: Voucher đổi được sẽ có hạn sử dụng đến hết ngày {new Date(new Date(selectedCampaign.endDate).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                 </div>
                 
                 <div>
                    <label className="form-label">Nhập số điện thoại để đối chiếu điểm</label>
                    <input 
                      type="tel"
                      className="form-input"
                      placeholder="0912345678"
                      value={redeemPhone}
                      onChange={e => setRedeemPhone(e.target.value)}
                      required
                    />
                 </div>
                 
                 <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center" }} disabled={redeeming || !redeemPhone}>
                   {redeeming ? "Đang đổi quà..." : "✨ Xác Nhận Đổi Điểm"}
                 </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                 <div style={{ fontSize: 64, marginBottom: 16 }}>{redeemResult.rewardType === "GIFT" ? "🎁" : "🎟️"}</div>
                 <h3 style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", marginBottom: 8 }}>Đổi thành công!</h3>
                 
                 {redeemResult.rewardType === "GIFT" ? (
                    <div style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                       Bạn đã nhận được phần quà là:<br/>
                       <strong style={{ fontSize: 20, color: "var(--text-primary)" }}>{redeemResult.giftName}</strong><br/>
                       <span style={{ fontSize: 14, marginTop: 12, display: "block" }}>Vui lòng đưa màn hình này cho Thu Ngân để nhận quà.</span>
                    </div>
                 ) : (
                    <div style={{ background: "rgba(255, 107, 53, 0.1)", padding: 20, borderRadius: 12, marginTop: 16 }}>
                       <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>Mã giảm giá của bạn là:</div>
                       <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", letterSpacing: "2px" }}>
                          {redeemResult.discountCode}
                       </div>
                       <div style={{ fontSize: 13, marginTop: 12 }}>Hãy lưu mã này và dán vào phần "Nhập mã giảm giá" trong Giỏ hàng nhé!</div>
                       {redeemResult.endDate && (
                         <div style={{ fontSize: 12, marginTop: 8, color: "var(--red)", fontWeight: 500, fontStyle: "italic", lineHeight: 1.4 }}>
                           Thời gian sử dụng mã kể từ ngày đổi thành công đến 15 ngày sau khi hết thời gian chiến dịch diễn ra.<br/>
                           (Hạn chót: {new Date(new Date(redeemResult.endDate).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("vi-VN")})
                         </div>
                       )}
                    </div>
                 )}
                 <button 
                   className="btn btn-primary" 
                   style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
                   onClick={() => { setRedeemResult(null); setSelectedCampaign(null); }}
                 >
                   Tuyệt vời, Cảm ơn!
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ===== Song Request Modal ===== */}
      {isSongRequestOpen && (
        <div className="modal-overlay" style={{ zIndex: 400 }} onClick={() => setIsSongRequestOpen(false)}>
          <div className="modal" style={{ maxWidth: 800, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <h2 className="modal-title">🎵 Yêu cầu bài hát</h2>
              <button className="modal-close" onClick={() => setIsSongRequestOpen(false)}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, background: "#f1f5f9", padding: 4, borderRadius: 8, flexShrink: 0 }}>
              <button 
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontWeight: 600, fontSize: 14, background: srActiveTab === "create" ? "#fff" : "transparent", color: srActiveTab === "create" ? "var(--primary)" : "#64748b", boxShadow: srActiveTab === "create" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => setSrActiveTab("create")}
              >
                Tạo yêu cầu
              </button>
              <button 
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontWeight: 600, fontSize: 14, background: srActiveTab === "list" ? "#fff" : "transparent", color: srActiveTab === "list" ? "var(--primary)" : "#64748b", boxShadow: srActiveTab === "list" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => setSrActiveTab("list")}
              >
                Danh sách bài hát
              </button>
            </div>

            {srActiveTab === "list" && (
               <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                 {srLoading ? (
                   <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Đang tải...</div>
                 ) : srList.length === 0 ? (
                   <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Chưa có bài hát nào được yêu cầu.</div>
                 ) : (
                   <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                     <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                       <thead>
                         <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                           <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: 60, textAlign: "center" }}>STT</th>
                           <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: "25%" }}>Bài hát</th>
                           <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: "20%" }}>Khách hàng</th>
                           <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600 }}>Cảm nghĩ</th>
                           <th style={{ padding: "12px 16px", color: "#475569", fontWeight: 600, width: 100, textAlign: "center" }}>Trạng thái</th>
                         </tr>
                       </thead>
                       <tbody>
                         {srList.map((req, index) => (
                           <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
                             <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 600, textAlign: "center" }}>{index + 1}</td>
                             <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 600 }}>{req.songName || "Không rõ"}</td>
                             <td style={{ padding: "12px 16px", color: "#64748b" }}>
                               <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                                 👤 {req.requesterName || "Khách ẩn danh"}
                               </div>
                               <div style={{ fontSize: 12, marginTop: 4 }}>{new Date(req.createdAt).toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'})}</div>
                             </td>
                             <td style={{ padding: "12px 16px", color: "#334155", fontStyle: req.message ? "italic" : "normal" }}>
                               {req.message ? `"${req.message}"` : "-"}
                             </td>
                             <td style={{ padding: "12px 16px", textAlign: "center" }}>
                               <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 12, background: req.status === "ACCEPTED" ? "rgba(16,185,129,0.1)" : req.status === "COMPLETED" ? "rgba(59,130,246,0.1)" : req.status === "REJECTED" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: req.status === "ACCEPTED" ? "#10b981" : req.status === "COMPLETED" ? "#3b82f6" : req.status === "REJECTED" ? "#ef4444" : "#f59e0b", whiteSpace: "nowrap" }}>
                                 {req.status === "ACCEPTED" ? "Sắp diễn" : req.status === "COMPLETED" ? "Đã diễn" : req.status === "REJECTED" ? "Từ chối" : "Đang chờ"}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
            )}

            {srActiveTab === "create" && (
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                {srSuccess ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎸</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>Gửi yêu cầu thành công!</h3>
                    <p style={{ color: "#64748b", marginBottom: 24 }}>Band nhạc đã nhận được yêu cầu của bạn và sẽ sớm phản hồi.</p>
                    <button className="btn btn-primary" onClick={() => { setSrSuccess(false); setSrActiveTab("list"); }} style={{ width: "100%", justifyContent: "center" }}>
                      Xem danh sách bài hát
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitSongRequest}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Chia sẻ cảm nghĩ / Câu chuyện <span style={{color:"red"}}>*</span></label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Bạn muốn chia sẻ điều gì?"
                    value={srMessage}
                    onChange={(e) => setSrMessage(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Bài hát yêu cầu (Không bắt buộc)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tên bài hát / Ca sĩ"
                    value={srSongName}
                    onChange={(e) => setSrSongName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Họ tên người yêu cầu (Không bắt buộc)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tên của bạn"
                    value={srRequester}
                    onChange={(e) => setSrRequester(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={srHasTip}
                      onChange={(e) => setSrHasTip(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
                    />
                    Bồi dưỡng cho Band nhạc (Tip)
                  </label>
                </div>

                {srHasTip && (
                  <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid #e2e8f0" }}>
                    <label className="form-label" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Mức tiền tip</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {[5000, 10000, 20000, 50000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setSrTipAmount(amount)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 20,
                            border: `1px solid ${srTipAmount === amount ? "var(--primary)" : "#cbd5e1"}`,
                            background: srTipAmount === amount ? "rgba(239, 68, 68, 0.1)" : "#fff",
                            color: srTipAmount === amount ? "var(--primary)" : "#475569",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {formatCurrency(amount)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSrTipAmount("other")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 20,
                          border: `1px solid ${srTipAmount === "other" ? "var(--primary)" : "#cbd5e1"}`,
                          background: srTipAmount === "other" ? "rgba(239, 68, 68, 0.1)" : "#fff",
                          color: srTipAmount === "other" ? "var(--primary)" : "#475569",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Khác
                      </button>
                    </div>
                    {srTipAmount === "other" && (
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Nhập số tiền khác..."
                        value={srOtherTipAmount}
                        onChange={(e) => setSrOtherTipAmount(Number(e.target.value))}
                        style={{ marginBottom: 12 }}
                      />
                    )}

                    {bankSettings?.band_bank_code && bankSettings?.band_bank_account && (
                      <div style={{ textAlign: "center", marginTop: 16, borderTop: "1px dashed #cbd5e1", paddingTop: 16 }}>
                        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Quét mã QR để chuyển tiền cho Band</p>
                        <img 
                          src={`https://img.vietqr.io/image/${bankSettings.band_bank_code}-${bankSettings.band_bank_account}-compact2.png?amount=${srTipAmount === "other" ? srOtherTipAmount : srTipAmount}&addInfo=Tip cho Band ${srRequester}`}
                          alt="QR Code Band"
                          style={{ width: 180, height: 180, borderRadius: 12, border: "1px solid #e2e8f0" }}
                        />
                        <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 8 }}>{bankSettings.band_bank_account_name}</div>
                        <div style={{ fontWeight: 600, color: "var(--primary)" }}>{bankSettings.band_bank_account} - {bankSettings.band_bank_code}</div>
                        
                        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          <button 
                            type="button"
                            onClick={async () => {
                              const url = `https://img.vietqr.io/image/${bankSettings.band_bank_code}-${bankSettings.band_bank_account}-compact2.png?amount=${srTipAmount === "other" ? srOtherTipAmount : srTipAmount}&addInfo=Tip cho Band ${srRequester}`;
                              try {
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const blobUrl = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = blobUrl;
                                a.download = "QR_Tip_Band.png";
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(blobUrl);
                                document.body.removeChild(a);
                              } catch (e) {
                                console.error("Lỗi khi tải ảnh, mở sang tab mới", e);
                                window.open(url, "_blank");
                              }
                            }}
                            style={{ padding: "8px 16px", borderRadius: 8, background: "#f8fafc", color: "#334155", fontWeight: 600, fontSize: 14, border: "1px solid #cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                          >
                            ⬇️ Tải mã QR về máy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsSongRequestOpen(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submittingSr}>
                    {submittingSr ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
