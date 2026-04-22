"use client";
import { useEffect, useState, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import styles from "./page.module.css";

interface Product {
  id: string;
  name: string;
  price: number;
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

export default function PublicOrderingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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

  // Point lookup state
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, prodRes, topRes, setRes, campRes] = await Promise.all([
        fetch("/api/categories", { next: { revalidate: 60 } }),
        fetch("/api/products?available=true", { next: { revalidate: 60 } }),
        fetch("/api/toppings", { next: { revalidate: 60 } }),
        fetch("/api/settings", { next: { revalidate: 60 } }),
        fetch("/api/public/campaigns", { next: { revalidate: 60 } }),
      ]);
      setCategories(await catRes.json());
      setProducts(await prodRes.json());
      setToppings(await topRes.json());
      setBankSettings(await setRes.json());
      
      const campaignsData = await campRes.json();
      if (Array.isArray(campaignsData)) setCampaigns(campaignsData);
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category.id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalSize(product.sizes?.[0]?.name || "");
    setModalToppings([]);
    setModalNote("");
    setModalQty(1);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const size = selectedProduct.sizes?.find((s) => s.name === modalSize);
    const sizePrice = size?.priceAdd || 0;
    const selectedToppingObjs = toppings.filter((t) => modalToppings.includes(t.id));
    const toppingTotal = selectedToppingObjs.reduce((sum, t) => sum + t.price, 0);
    const unitPrice = selectedProduct.price + sizePrice + toppingTotal;
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          totalAmount: totalRawAmount,
          discount: discountAmount,
          finalAmount: finalAmount,
          paymentMethod,
          paymentStatus: "PENDING", // Khách đặt luôn là PENDING
          note: orderNote || null,
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
        setOrderNote("");
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

  return (
    <div className={styles.posLayout}>
      {/* ===== LEFT: Menu Panel ===== */}
      <div className={styles.menuPanel}>
        <div className={styles.menuHeader}>
          <div className={styles.brandName}>
            <div className={styles.brandIcon}>🍹</div>
            <span className={styles.brandNameText}>NSGSTARTUP POS</span>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${selectedCategory === cat.id ? styles.active : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span> {cat.name}
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
                <div className={styles.productPrice}>{formatCurrency(product.price)}</div>
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

      {/* Overlay for Cart */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)} style={{ zIndex: 150 }}></div>
      )}

      {/* ===== Product Detail Modal ===== */}
      {selectedProduct && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setSelectedProduct(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h2 className="modal-title" style={{ fontSize: "24px", fontWeight: 800 }}>{selectedProduct.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>

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
                  (selectedProduct.price +
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
          <div className="modal" style={{ maxWidth: 480, height: "80vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
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
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--purple)" }}>{lookupResult.currentPoints}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Điểm hiện tại</div>
                    </div>
                    <div style={{ flex: 1, background: "white", padding: 12, borderRadius: 8, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{lookupResult.totalPoints}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Điểm tích lũy</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Lịch sử phần thưởng</div>
                {lookupResult.pointLogs?.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Chưa có lịch sử.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {lookupResult.pointLogs?.map((log: any) => (
                      <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{log.note || (log.action === "EARN" ? "Tích điểm HĐ" : "Đổi Quà")}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                            {new Date(log.createdAt).toLocaleString("vi-VN")}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: log.action === "EARN" ? "var(--green)" : "var(--red)" }}>
                          {log.action === "EARN" ? "+" : "-"}{log.points}
                        </div>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
}

