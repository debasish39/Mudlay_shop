import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  LogOut,
  Plus,
  Minus,
  Pencil,
  Trash2,
  X,
  Package,
  ShoppingBag,
  ClipboardList,
  RefreshCw,
  Search,
  ImagePlus,
  ChevronRight,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Eye,
  Menu,
} from "lucide-react";
import api, { imageUrl } from "../api";
import logo from "/logo.png";
const blank = {
  name: "",
  category: "Women",
  price: "",
  originalPrice: "",
  description: "",
  sizes: "S, M, L, XL",
  colors: "Black, Cream",
  stock: "10",
  badge: "New",
  image: "",
  active: true,
};
const categories = [
  "Women",
  "Men",
  "Kids",
  "Accessories",
  "Ethnic wear",
  "Footwear",
  "Other",
];
const orderStatuses = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
const getProductImages = (product) => {
  // MongoDB stores the primary image in `image` and the full gallery in `images`.
  // Put the primary image first, keep gallery URLs, and remove duplicates.
  const candidates = [
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
  ].filter(Boolean);
  return [...new Set(candidates.map(imageUrl).filter(Boolean))].slice(0, 5);
};
function Notice({ type = "success", children, onClose }) {
  const isError = type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
function EmptyState({ icon: Icon = Package, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#eef1e7] text-[#405543]">
        <Icon size={28} strokeWidth={1.7} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
function StockControl({ product, onSave, saving = false }) {
  const [draft, setDraft] = useState(String(product.stock ?? 0));

  useEffect(() => {
    setDraft(String(product.stock ?? 0));
  }, [product.stock]);

  const commit = (value) => {
    const next = Math.max(0, Math.floor(Number(value)));
    if (!Number.isFinite(next) || String(next) === "" || next === Number(product.stock ?? 0)) {
      setDraft(String(product.stock ?? 0));
      return;
    }
    setDraft(String(next));
    onSave(product, next);
  };

  const adjust = (delta) => {
    const current = Number(draft === "" ? product.stock ?? 0 : draft) || 0;
    commit(Math.max(0, current + delta));
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={saving || Number(draft || 0) <= 0}
        aria-label={`Decrease stock for ${product.name}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        aria-label={`Stock quantity for ${product.name}`}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft === "") {
            setDraft(String(product.stock ?? 0));
            return;
          }
          commit(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(String(product.stock ?? 0));
            event.currentTarget.blur();
          }
        }}
        className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={() => adjust(1)}
        disabled={saving}
        aria-label={`Increase stock for ${product.name}`}
        className="grid h-8 w-8 place-items-center rounded-lg bg-[#e8eee2] text-[#405543] transition hover:bg-[#dce7b7] disabled:cursor-wait disabled:opacity-50"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function Admin({ onBack }) {
  const [token, setToken] = useState(
    localStorage.getItem("mudlay_admin_token") || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [productsBusy, setProductsBusy] = useState(false);
  const [stockSaving, setStockSaving] = useState({});
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedPreviews, setSelectedPreviews] = useState([]);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("products");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  async function load() {
    setProductsBusy(true);
    try {
      const { data } = await api.get("/products");
      setProducts(data.products || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Cannot load products. Check the backend and MongoDB."
      );
    } finally {
      setProductsBusy(false);
    }
  }
  async function loadOrders() {
    setOrdersBusy(true);
    try {
      const { data } = await api.get("/orders");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load orders.");
    } finally {
      setOrdersBusy(false);
    }
  }
  async function updateStock(product, nextStock) {
    const id = product._id;
    const previousStock = Number(product.stock ?? 0);
    const quantity = Math.max(0, Math.floor(Number(nextStock)));
    if (!Number.isFinite(quantity) || quantity === previousStock || stockSaving[id]) return;

    setError("");
    setNotice("");
    setStockSaving((current) => ({ ...current, [id]: true }));
    // Optimistically update the UI so the admin can keep working immediately.
    setProducts((current) =>
      current.map((item) =>
        String(item._id) === String(id) ? { ...item, stock: quantity } : item
      )
    );

    try {
      await api.put(`/products/${id}`, { stock: quantity });
      setNotice(`Stock updated: ${product.name} now has ${quantity} unit${quantity === 1 ? "" : "s"}.`);
    } catch (err) {
      setProducts((current) =>
        current.map((item) =>
          String(item._id) === String(id) ? { ...item, stock: previousStock } : item
        )
      );
      setError(err.response?.data?.message || "Could not update stock. Please try again.");
    } finally {
      setStockSaving((current) => ({ ...current, [id]: false }));
    }
  }

  async function updateOrder(id, status) {
    setError("");
    setNotice("");
    try {
      await api.patch(`/orders/${id}/status`, { status });
      setNotice("Order status updated.");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update order status.");
    }
  }
  useEffect(() => {
    load();
    if (token) loadOrders();
  }, [token]);
  useEffect(() => {
    return () => {
      selectedPreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      });
    };
  }, [selectedPreviews]);
  const currentProduct = useMemo(
    () => (editing ? products.find((product) => product._id === editing) : null),
    [editing, products]
  );
  const existingImages = useMemo(
    () => getProductImages(currentProduct),
    [currentProduct]
  );
  const visiblePreviews = selectedPreviews.length
    ? selectedPreviews
    : existingImages;
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.name, product.category, product.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory =
        categoryFilter === "All" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);
  const inStockCount = products.filter((product) => Number(product.stock) > 0).length;
  const lowStockCount = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 5
  ).length;
  const totalUnits = products.reduce(
    (sum, product) => sum + Math.max(0, Number(product.stock) || 0),
    0
  );
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("mudlay_admin_token", data.token);
      setToken(data.token);
      setNotice("Welcome back. You are signed in.");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    localStorage.removeItem("mudlay_admin_token");
    setToken("");
    setPassword("");
    setOrders([]);
    setNotice("");
    setError("");
  }
  function add() {
    setEditing(null);
    setForm(blank);
    setFiles([]);
    setSelectedPreviews([]);
    setShow(true);
    setError("");
    setNotice("");
  }
  function edit(product) {
    setEditing(product._id);
    setForm({
      ...blank,
      ...product,
      price: String(product.price ?? ""),
      originalPrice: String(product.originalPrice || ""),
      stock: String(product.stock ?? 0),
      sizes: (product.sizes || []).join(", "),
      colors: (product.colors || []).join(", "),
      image: product.image || product.images?.[0] || "",
      active: product.active !== false,
    });
    setFiles([]);
    setSelectedPreviews([]);
    setShow(true);
    setError("");
    setNotice("");
  }
  function handleImageFiles(event) {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 5) {
      setError("Choose no more than 5 photos.");
    } else {
      setError("");
    }
    const accepted = selected.slice(0, 5);
    setFiles(accepted);
    setSelectedPreviews(accepted.map((file) => URL.createObjectURL(file)));
  }
  function closeForm() {
    setShow(false);
    setFiles([]);
    setSelectedPreviews([]);
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      [
        "name",
        "category",
        "price",
        "originalPrice",
        "description",
        "stock",
        "badge",
        "sizes",
        "colors",
        "active",
      ].forEach((key) => {
        const value = key === "active" ? form.active !== false : form[key] ?? "";
        fd.append(key, String(value));
      });
      if (files.length) {
        files.forEach((file) => fd.append("images", file));
      } else {
        const previousPrimary =
          currentProduct?.image || currentProduct?.images?.[0] || "";
        if (form.image && form.image !== previousPrimary) {
          fd.append("imageUrl", form.image);
        }
      }
      if (editing) {
        await api.put(`/products/${editing}`, fd);
      } else {
        await api.post("/products", fd);
      }
      closeForm();
      setNotice(editing ? "Product updated successfully." : "Product added successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save product.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/products/${product._id}`);
      setNotice("Product deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    }
  }
  function jumpTo(tab) {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    document.getElementById(tab === "orders" ? "orders-section" : "products-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (!token) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#f6f5ef] text-slate-900">
        <div className="absolute inset-x-0 top-0 h-72 bg-[#273a2d]" />
        <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <ArrowLeft size={16} /> Back to store
          </button>
          <form
            onSubmit={login}
            className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(20,35,25,.16)] sm:p-9"
          >
            <div className="mb-7 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#273a2d] text-[#dce7b7]">
                <img src={logo} alt="Mudlay" className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718066]">
                  Mudlay
                </p>
                <p className="text-sm text-slate-500">Admin workspace</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#718066]">WELCOME BACK</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your store, at a glance.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sign in to manage your catalogue, stock and customer orders.
            </p>
            {error && (
              <div className="mt-5">
                <Notice type="error" onClose={() => setError("")}>{error}</Notice>
              </div>
            )}
            <label className="mt-6 block text-sm font-semibold">
              Admin email
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourstore.com"
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-[#718066] focus:bg-white focus:ring-4 focus:ring-[#718066]/10"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 font-normal outline-none transition focus:border-[#718066] focus:bg-white focus:ring-4 focus:ring-[#718066]/10"
              />
            </label>
            <button
              disabled={busy}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#273a2d] px-5 font-semibold text-white shadow-lg shadow-[#273a2d]/15 transition hover:bg-[#344c3a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in to workspace"}
              {!busy && <ChevronRight size={18} />}
            </button>
            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              Admin credentials are configured in your server environment.
            </p>
          </form>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#f6f5ef] pb-24 text-slate-900 md:pb-8">
      {/* App-style top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#dce7b7] shadow-sm">
              <img src={logo} alt="Mudlay" className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-[#718066]">
                Mudlay / Studio
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                Store dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="hidden min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium transition hover:border-slate-300 sm:flex"
            >
              <Eye size={15} /> View store
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex min-h-10 items-center gap-2 rounded-full bg-[#273a2d] px-3.5 text-sm font-semibold text-white transition hover:bg-[#344c3a] sm:px-4"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white md:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-black/5 bg-white p-3 md:hidden">
            <button onClick={() => jumpTo("products")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium hover:bg-slate-50">
              <Package size={18} /> Products
            </button>
            <button onClick={() => jumpTo("orders")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium hover:bg-slate-50">
              <ClipboardList size={18} /> Customer orders
            </button>
            <button onClick={onBack} className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm font-medium hover:bg-slate-50">
              <Eye size={18} /> View storefront
            </button>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#273a2d] p-5 text-white sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.06]" />
          <div className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-[#dce7b7]/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#dce7b7]" />
                Your business overview
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Make today a good <span className="text-[#dce7b7]">store day.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/65 sm:text-base">
                Manage your collection, keep an eye on stock, and move customer orders forward.
              </p>
            </div>
            <button
              onClick={add}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#dce7b7] px-5 font-bold text-[#273a2d] shadow-lg transition hover:bg-[#e8efcf] active:scale-[.98]"
            >
              <Plus size={19} /> Add product
            </button>
          </div>
        </section>
        {(notice || error) && (
          <div className="mt-4">
            {error ? (
              <Notice type="error" onClose={() => setError("")}>{error}</Notice>
            ) : (
              <Notice onClose={() => setNotice("")}>{notice}</Notice>
            )}
          </div>
        )}
        {/* Overview cards */}
        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 xl:grid-cols-4">
          {[
            {
              label: "Total products",
              value: products.length,
              icon: Package,
              tone: "bg-[#e8eee2] text-[#405543]",
              hint: "In your catalogue",
            },
            {
              label: "In stock",
              value: inStockCount,
              icon: CheckCircle2,
              tone: "bg-blue-50 text-blue-700",
              hint: "Products available",
            },
            {
              label: "Low stock",
              value: lowStockCount,
              icon: AlertCircle,
              tone: "bg-amber-50 text-amber-700",
              hint: "5 units or fewer",
            },
            {
              label: "Total units",
              value: totalUnits.toLocaleString("en-IN"),
              icon: Boxes,
              tone: "bg-violet-50 text-violet-700",
              hint: "Across all products",
            },
          ].map(({ label, value, icon: Icon, tone, hint }) => (
            <div key={label} className="rounded-3xl border border-black/[0.035] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
                  <Icon size={19} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live</span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
              <p className="mt-1 text-xs text-slate-400">{hint}</p>
            </div>
          ))}
        </section>
        {/* Products */}
        <section id="products-section" className="scroll-mt-24 pt-8 sm:pt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718066]">Catalogue</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Products</h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                  {filteredProducts.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Your collection, all in one place.</p>
            </div>
            <button
              onClick={load}
              disabled={productsBusy}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold transition hover:border-slate-300 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw size={15} className={productsBusy ? "animate-spin" : ""} />
              {productsBusy ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative block flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products, categories…"
                className="min-h-12 w-full rounded-2xl border border-slate-200/80 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#718066] focus:ring-4 focus:ring-[#718066]/10"
              />
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-12 rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:border-[#718066] sm:min-w-44"
            >
              <option value="All">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          {productsBusy && !products.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-3xl bg-white p-2.5">
                  <div className="aspect-[4/5] animate-pulse rounded-2xl bg-slate-100" />
                  <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length ? (
            <>
              {/* Compact cards for phone/tablet */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
                {filteredProducts.map((product) => {
                  const photos = getProductImages(product);
                  return (
                    <article key={product._id} className="min-w-0 overflow-hidden rounded-3xl border border-black/[0.035] bg-white p-2.5 shadow-sm">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-[#f2f1eb]">
                        {photos[0] ? (
                          <img src={photos[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]" />
                        ) : (
                          <div className="grid h-full place-items-center text-slate-400"><ImagePlus size={28} /></div>
                        )}
                        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold ${Number(product.stock) > 0 ? "bg-white/90 text-[#405543]" : "bg-red-100 text-red-700"}`}>
                          {Number(product.stock) > 0 ? "In stock" : "Sold out"}
                        </span>
                        {photos.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                            +{photos.length - 1} photos
                          </span>
                        )}
                      </div>
                      <div className="px-1 pb-1 pt-3">
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#718066]">{product.category}</p>
                        <h3 className="mt-1 truncate text-sm font-semibold">{product.name}</h3>
                        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                          <span className="text-sm font-bold">{money(product.price)}</span>
                          {Number(product.originalPrice) > Number(product.price) && (
                            <span className="text-[10px] text-slate-400 line-through">{money(product.originalPrice)}</span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Stock · auto-save</span>
                            <StockControl product={product} onSave={updateStock} saving={Boolean(stockSaving[product._id])} />
                          </div>
                          <div className="flex gap-1.5 ml-1 mt-5">
                            <button onClick={() => edit(product)} aria-label={`Edit ${product.name}`} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"><Pencil size={15} /></button>
                            <button onClick={() => remove(product)} aria-label={`Delete ${product.name}`} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-600 transition hover:bg-red-50"><Trash2 size={15} /></button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {/* Wider desktop table */}
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-black/[0.035] bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-[#f7f7f2] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Product</th>
                        <th className="px-5 py-4 font-semibold">Category</th>
                        <th className="px-5 py-4 font-semibold">Price</th>
                        <th className="px-5 py-4 font-semibold">Stock</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                        <th className="px-5 py-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const photos = getProductImages(product);
                        return (
                          <tr key={product._id} className="border-t border-slate-100 transition hover:bg-[#fbfbf8]">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                  {photos[0] ? <img src={photos[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImagePlus size={17} /></div>}
                                </div>
                                <div className="min-w-0">
                                  <p className="max-w-xs truncate font-semibold text-slate-900">{product.name}</p>
                                  <p className="mt-1 max-w-sm truncate text-xs text-slate-500">{product.description}</p>
                                  {photos.length > 1 && <p className="mt-1 text-[11px] text-[#718066]">{photos.length} photos</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">{product.category}</td>
                            <td className="px-5 py-3.5 font-semibold">{money(product.price)}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col items-start gap-1.5">
                                <StockControl product={product} onSave={updateStock} saving={Boolean(stockSaving[product._id])} />
                                {stockSaving[product._id] ? (
                                  <span className="text-[10px] text-slate-400">Saving…</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Auto-saves on change</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(product.stock) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                {Number(product.stock) > 0 ? "Available" : "Out of stock"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => edit(product)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50"><Pencil size={14} /> Edit</button>
                                <button onClick={() => remove(product)} aria-label={`Delete ${product.name}`} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-3xl border border-black/[0.035] bg-white">
              <EmptyState
                icon={Package}
                title={search || categoryFilter !== "All" ? "No matching products" : "Your catalogue is ready"}
                description={search || categoryFilter !== "All" ? "Try another search or category filter." : "Add your first product and it will appear here."}
                action={!search && categoryFilter === "All" ? <button onClick={add} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#273a2d] px-5 text-sm font-semibold text-white"><Plus size={16} /> Add first product</button> : null}
              />
            </div>
          )}
        </section>
        {/* Orders */}
        <section id="orders-section" className="scroll-mt-24 pt-10 sm:pt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718066]">Fulfilment</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Customer orders</h2>
              <p className="mt-1 text-sm text-slate-500">Keep every order moving.</p>
            </div>
            <button
              onClick={loadOrders}
              disabled={ordersBusy}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold transition hover:border-slate-300 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw size={15} className={ordersBusy ? "animate-spin" : ""} />
              {ordersBusy ? "Loading…" : "Refresh orders"}
            </button>
          </div>
          {orders.length ? (
            <>
              <div className="mt-5 grid gap-3 lg:hidden">
                {orders.map((order) => (
                  <article key={order._id} className="rounded-3xl border border-black/[0.035] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#718066]">Order number</p>
                        <h3 className="mt-1 text-base font-bold">#{String(order._id).slice(-7).toUpperCase()}</h3>
                        <p className="mt-1 text-xs text-slate-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                      <p className="text-lg font-bold">{money(order.subtotal)}</p>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[#f8f8f4] p-3">
                      <p className="font-semibold">{order.customer?.name || "Customer"}</p>
                      <p className="mt-0.5 break-all text-xs text-slate-500">{order.customer?.email || ""}</p>
                      <p className="mt-1 text-xs text-slate-500">{order.shippingAddress?.phone || order.customer?.phone || ""}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      {(order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ") || "No item details"}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="text-xs font-semibold text-slate-500">Update status</span>
                      <select
                        value={order.status}
                        onChange={(event) => updateOrder(order._id, event.target.value)}
                        className="min-h-10 max-w-[58%] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold capitalize outline-none focus:border-[#718066]"
                      >
                        {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 hidden overflow-hidden rounded-3xl border border-black/[0.035] bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-sm">
                    <thead className="bg-[#f7f7f2] text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Order</th>
                        <th className="px-5 py-4 font-semibold">Customer</th>
                        <th className="px-5 py-4 font-semibold">Items</th>
                        <th className="px-5 py-4 font-semibold">Total</th>
                        <th className="px-5 py-4 font-semibold">Date</th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id} className="border-t border-slate-100 hover:bg-[#fbfbf8]">
                          <td className="px-5 py-4 font-bold">#{String(order._id).slice(-7).toUpperCase()}</td>
                          <td className="px-5 py-4">
                            <p className="font-semibold">{order.customer?.name || "Customer"}</p>
                            <p className="mt-1 text-xs text-slate-500">{order.customer?.email || ""}</p>
                            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                              {[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.pincode].filter(Boolean).join(", ")}
                            </p>
                          </td>
                          <td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{(order.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td>
                          <td className="px-5 py-4 font-bold">{money(order.subtotal)}</td>
                          <td className="px-5 py-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                          <td className="px-5 py-4">
                            <select value={order.status} onChange={(event) => updateOrder(order._id, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold capitalize outline-none focus:border-[#718066]">
                              {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-3xl border border-black/[0.035] bg-white">
              <EmptyState
                icon={ClipboardList}
                title={ordersBusy ? "Loading orders…" : "No orders yet"}
                description="New customer orders will appear here when they're placed."
                action={<button onClick={loadOrders} disabled={ordersBusy} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={14} /> Refresh</button>}
              />
            </div>
          )}
        </section>
      </div>
      {/* Android-style bottom navigation */}
      {/* Responsive add/edit product sheet */}
      {show && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-[3px] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) closeForm();
          }}
        >
          <div className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-[#fbfbf8] shadow-2xl sm:max-h-[90vh] sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8eee2] text-[#405543]">
                  {editing ? <Pencil size={19} /> : <ImagePlus size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718066]">{editing ? "Edit catalogue" : "New catalogue item"}</p>
                  <h2 className="truncate text-lg font-semibold sm:text-xl">{editing ? "Update product" : "Add a product"}</h2>
                </div>
              </div>
              <button type="button" onClick={closeForm} disabled={busy} aria-label="Close form" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-4 p-5 sm:grid-cols-2 sm:gap-5 sm:p-7">
                <label className="text-sm font-semibold sm:col-span-2">
                  Product name *
                  <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Classic linen shirt" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none transition focus:border-[#718066] focus:ring-4 focus:ring-[#718066]/10" />
                </label>
                <label className="text-sm font-semibold">
                  Category *
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">
                  Badge
                  <input maxLength={30} value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="New, Bestseller…" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold">
                  Active listing
                  <input
                    type="checkbox"
                    checked={form.active !== false}
                    onChange={(event) => setForm({ ...form, active: event.target.checked })}
                    className="h-5 w-5 accent-[#273a2d]"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Selling price (₹) *
                  <input required min="0" step="0.01" type="number" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="text-sm font-semibold">
                  Original price (₹)
                  <input min="0" step="0.01" type="number" value={form.originalPrice} onChange={(event) => setForm({ ...form, originalPrice: event.target.value })} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="text-sm font-semibold">
                  Stock quantity *
                  <input required min="0" step="1" type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="text-sm font-semibold">
                  Sizes
                  <input value={form.sizes} onChange={(event) => setForm({ ...form, sizes: event.target.value })} placeholder="S, M, L, XL" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  Colours
                  <input value={form.colors} onChange={(event) => setForm({ ...form, colors: event.target.value })} placeholder="Black, Cream, Olive" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">
                  Description *
                  <textarea required maxLength={1000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the fabric, fit and key details…" className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-normal leading-6 outline-none transition focus:border-[#718066] focus:ring-4 focus:ring-[#718066]/10" />
                  <span className="mt-1 block text-right text-[11px] font-normal text-slate-400">{form.description.length}/1000</span>
                </label>
                <div className="sm:col-span-2">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Product photos</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Up to 5 photos · JPG, PNG, WEBP or AVIF · max 5 MB each</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e8eee2] px-2.5 py-1 text-xs font-bold text-[#405543]">{files.length || visiblePreviews.length}/5</span>
                  </div>
                  <label className="mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cfd8c7] bg-white px-4 py-5 text-center transition hover:border-[#718066] hover:bg-[#fbfcf8]">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e8eee2] text-[#405543]"><ImagePlus size={20} /></div>
                    <span className="mt-2 text-sm font-semibold">{files.length ? "Choose different photos" : "Tap to choose photos"}</span>
                    <span className="mt-1 text-xs text-slate-400">Select multiple images from your device</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={handleImageFiles} className="sr-only" />
                  </label>
                  {visiblePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                      {visiblePreviews.map((src, index) => (
                        <div key={`${src}-${index}`} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <img src={src} alt={`Product photo ${index + 1}`} className="h-full w-full object-cover" />
                          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-1 text-[9px] font-semibold text-white">{index === 0 ? "Primary" : `Photo ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {editing && !files.length && existingImages.length > 0 && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">Existing photos are kept when you don't select new files. Selecting new photos replaces the gallery.</p>
                  )}
                </div>
                <label className="text-sm font-semibold sm:col-span-2">
                  Or use a photo URL
                  <input value={form.image || ""} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="https\://…" className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-normal outline-none focus:border-[#718066]" />
                  <span className="mt-1 block text-xs font-normal text-slate-400">A URL is useful if the image is already hosted online.</span>
                </label>
              </div>
              <div className="sticky bottom-0 flex gap-3 border-t border-black/5 bg-white/95 p-4 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur sm:px-7">
                <button type="button" onClick={closeForm} disabled={busy} className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button disabled={busy} className="min-h-12 flex-[1.4] rounded-2xl bg-[#273a2d] px-4 text-sm font-bold text-white shadow-lg shadow-[#273a2d]/15 transition hover:bg-[#344c3a] disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? "Saving product…" : editing ? "Save changes" : "Add product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
