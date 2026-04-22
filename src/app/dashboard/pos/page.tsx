"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";
import styles from "./pos.module.css";

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

export default function POSPage() {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [bankSettings, setBankSettings] = useState<any>(null);

  // Voucher Code logic
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: string; value: number; rewardId: string } | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  // Product detail modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState("");
  const [modalToppings, setModalToppings] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState("");
  const [modalQty, setModalQty] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, prodRes, topRes, setRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products?available=true"),
        fetch("/api/toppings"),
        fetch("/api/settings"),
      ]);
      setCategories(await catRes.json());
      setProducts(await prodRes.json());
      setToppings(await topRes.json());
      setBankSettings(await setRes.json());

      const params = new URLSearchParams(window.location.search);
      const editId = params.get("editOrderId");
      if (editId) {
        setEditOrderId(editId);
        try {
          const orderRes = await fetch(`/api/orders/${editId}`);
          if (orderRes.ok) {
            const order = await orderRes.json();
            setCustomerName(order.customerName || "");
            setCustomerPhone(order.customerPhone || "");
            if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
            if (order.note) setOrderNote(order.note);
            
            const loadedCart: CartItem[] = order.items.map((item: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              product: item.product,
              sizeName: item.sizeName || undefined,
              sizePrice: 0,
              quantity: item.quantity,
              toppings: item.toppings.map((t: any) => ({ topping: t.topping, price: t.price })),
              note: item.note || undefined,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            }));
            setCart(loadedCart);
          }
        } catch (e) {
          console.error("Failed to load edit order", e);
        }
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
    setSelectedProduct(product);
    setModalSize(product.sizes[0]?.name || "");
    setModalToppings([]);
    setModalNote("");
    setModalQty(1);
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    const size = selectedProduct.sizes.find((s) => s.name === modalSize);
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

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  let calculatedDiscount = discount;
  if (appliedDiscount) {
    if (appliedDiscount.type === "FIXED_AMOUNT") {
      calculatedDiscount = appliedDiscount.value;
    } else if (appliedDiscount.type === "PERCENTAGE") {
      calculatedDiscount = (subtotal * appliedDiscount.value) / 100;
    }
  }

  const finalAmount = Math.max(subtotal - calculatedDiscount, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        setDiscount(0); // Clear manual discount
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

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const url = editOrderId ? `/api/orders/${editOrderId}` : "/api/orders";
      const method = editOrderId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          totalAmount: subtotal,
          discount: calculatedDiscount,
          finalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "CASH" ? "PAID" : "PENDING",
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
        setDiscount(0);
        setDiscountCodeInput("");
        setAppliedDiscount(null);
        setOrderNote("");
        if (editOrderId) {
          window.location.href = "/dashboard/orders";
        }
      }
    } catch (err) {
      alert("Lỗi khi tạo đơn hàng!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.posLayout}>
      {/* ===== LEFT: Menu Panel ===== */}
      <div className={styles.menuPanel}>
        {/* Header */}
        <div className={styles.menuHeader}>
          <div className={styles.brandName}>
            <div className={styles.brandIcon}>☕</div>
            NSG STARTUP
          </div>
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
        </div>

        {/* Search */}
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Tìm món..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              <div className={styles.emptyText}>Chưa có món nào hoặc các món đã hết hàng.</div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT: Cart Panel ===== */}
      <div className={`${styles.cartPanel} ${isCartOpen ? styles.open : ""}`}>
        <div className={styles.cartHeader}>
          <h2 className={styles.cartTitle}>
            <span className={styles.cartTitleIcon}>🛒</span>
            Giỏ hàng
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={styles.cartBadge}>{totalItems} món</span>
            {cart.length > 0 && (
              <button className={styles.clearCartBtn} onClick={() => setCart([])}>
                Xóa tất cả
              </button>
            )}
            <button className={styles.closeCartMobile} onClick={() => setIsCartOpen(false)}>✕</button>
          </div>
        </div>

        {/* Customer Info */}
        <div className={styles.customerInfo}>
          <input
            className={styles.customerInput}
            placeholder="👤 Tên khách hàng"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className={styles.customerInput}
            placeholder="📱 Số điện thoại"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        {/* Cart Items */}
        <div className={styles.cartItems}>
          {cart.length === 0 ? (
            <div className={styles.cartEmpty}>
              <div className={styles.cartEmptyIcon}>🧺</div>
              <div className={styles.cartEmptyText}>Chưa có món nào</div>
            </div>
          ) : (
            cart.map((item) => (
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
                  <div className={styles.qtyControl}>
                    <button onClick={() => updateQty(item.id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <div className={styles.cartItemPrice}>{formatCurrency(item.totalPrice)}</div>
                  <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                </div>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <div style={{ padding: "16px 0", borderTop: "2px dashed #edf0f5", marginTop: "8px" }}>
              <div className={styles.cartRow}>
                <span>Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {editOrderId && (
                <div style={{ marginBottom: "15px", color: "var(--purple)", fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", background: "rgba(102, 51, 153, 0.1)", padding: "8px 12px", borderRadius: "8px" }}>
                  <span>✏️</span> Đang ở chế độ sửa đơn thao tác.
                </div>
              )}

              <div className={`${styles.cartRow} ${styles.discountRow}`}>
                <span>Giảm giá:</span>
                {!appliedDiscount ? (
                  <input
                    type="number"
                    className={styles.discountInput}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    min={0}
                    max={subtotal}
                  />
                ) : (
                  <span style={{ fontWeight: 600, color: "var(--red)" }}>-{formatCurrency(calculatedDiscount)} ({appliedDiscount.code})</span>
                )}
              </div>
              
              <div style={{ display: "flex", gap: "8px", margin: "12px 0" }}>
                 <input
                   className="form-input"
                   style={{ flex: 1, marginBottom: 0, padding: 8, fontSize: 13 }}
                   placeholder="Nhập mã voucher khách đọc..."
                   value={discountCodeInput}
                   onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                   disabled={!!appliedDiscount || validatingDiscount}
                 />
                 {appliedDiscount ? (
                   <button className="btn btn-secondary btn-sm" onClick={() => setAppliedDiscount(null)} style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "none" }}>
                     Hủy mã
                   </button>
                 ) : (
                   <button className="btn btn-primary btn-sm" onClick={handleValidateDiscount} disabled={validatingDiscount || !discountCodeInput}>
                     {validatingDiscount ? "Dò..." : "Dò Mã"}
                   </button>
                 )}
              </div>
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
                    {method === "CASH" ? "💵 Tiền mặt" : method === "TRANSFER" ? "🏦 CK" : "💳 Thẻ"}
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
                placeholder="Ghi chú đơn hàng..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className={styles.cartFooter}>
          <button className="btn btn-primary" style={{ width: "100%", padding: "16px", fontSize: "18px", fontWeight: "700" }} onClick={handleSubmitOrder} disabled={submitting}>
            {submitting ? "Đang xử lý..." : (editOrderId ? "Cập nhật đơn hàng" : "Tạo đơn hàng")}
          </button>
        </div>

        {/* Bottom toolbar */}
        <div className={styles.bottomToolbar}>
          <button className={styles.toolbarBtn}>🍴</button>
          <button className={styles.toolbarBtn}>⭐</button>
          <button className={styles.toolbarBtn}>⚙️</button>
        </div>
      </div>

      {/* Floating Cart Button */}
      {!isCartOpen && (
        <button 
          className={`${styles.mobileCartBtn} ${cart.length > 0 ? styles.hasItems : ""}`}
          onClick={() => setIsCartOpen(true)}
        >
          <span>🛒 Xem Giỏ</span>
          <span>{totalItems} món {cart.length > 0 ? `· ${formatCurrency(finalAmount)}` : ""}</span>
        </button>
      )}

      {/* Overlay for Cart */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)} style={{ zIndex: 1500 }}></div>
      )}

      {/* ===== Product Detail Modal ===== */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedProduct.name}</h2>
              <button className="modal-close" onClick={() => setSelectedProduct(null)}>✕</button>
            </div>

            {/* Size selection */}
            {selectedProduct.sizes.length > 0 && (
              <div className="form-group">
                <label className="form-label">Chọn size</label>
                <div className={styles.sizeOptions}>
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size.id}
                      className={`${styles.sizeBtn} ${modalSize === size.name ? styles.sizeActive : ""}`}
                      onClick={() => setModalSize(size.name)}
                    >
                      <span>{size.name}</span>
                      {size.priceAdd > 0 && <span className={styles.sizePrice}>+{formatCurrency(size.priceAdd)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Toppings */}
            {toppings.length > 0 && (
              <div className="form-group">
                <label className="form-label">Topping (tùy chọn)</label>
                <div className={styles.toppingOptions}>
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
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <input
                className="form-input"
                placeholder="Ít đá, không đường..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
              />
            </div>

            {/* Qty + Add */}
            <div className={styles.modalFooter}>
              <div className={styles.qtyControl} style={{ fontSize: 18 }}>
                <button onClick={() => setModalQty(Math.max(1, modalQty - 1))}>−</button>
                <span>{modalQty}</span>
                <button onClick={() => setModalQty(modalQty + 1)}>+</button>
              </div>
              <button
                className={styles.submitBtn}
                style={{ flex: 1 }}
                onClick={addToCart}
              >
                Thêm vào giỏ · {formatCurrency(
                  (selectedProduct.price +
                    (selectedProduct.sizes.find((s) => s.name === modalSize)?.priceAdd || 0) +
                    toppings.filter((t) => modalToppings.includes(t.id)).reduce((s, t) => s + t.price, 0)) *
                    modalQty
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Success Modal ===== */}
      {successOrder && !editOrderId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 className="modal-title" style={{ marginBottom: 8 }}>
              Đơn #{successOrder.orderNumber} đã được tạo!
            </h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Thông báo đã được gửi đến nhân viên pha chế
            </p>

            {successOrder.paymentMethod === "TRANSFER" && bankSettings?.bank_code && bankSettings?.bank_account && (
              <div style={{ textAlign: "center", marginBottom: "24px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: 600, color: "var(--red)", marginBottom: 12 }}>Vui lòng đưa khách quét mã QR để thanh toán</p>
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
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => {
                  window.open(`/order-status/${successOrder.id}`, "_blank");
                  setSuccessOrder(null);
                }}
              >
                Xem trạng thái
              </button>
              <button
                className={styles.submitBtn}
                style={{ flex: 1 }}
                onClick={() => setSuccessOrder(null)}
              >
                Tạo đơn mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
