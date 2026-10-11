import { useEffect, useMemo, useState } from "react";

import {

  LuArrowRight,
  LuArrowLeft,
  LuArrowUp,

  LuCheck,

  LuChevronDown,

  LuHeart,

  LuMenu,

  LuMessageCircle,

  LuMinus,

  LuPlus,

  LuRotateCcw,

  LuSearch,
  LuShare2,
  LuChevronLeft,
  LuChevronRight,

  LuShoppingBag,

  LuSlidersHorizontal,

  LuSparkles,

  LuTrash2,

  LuTruck,

  LuShieldCheck,

  LuX,

} from "react-icons/lu";

import AOS from "aos";

import "aos/dist/aos.css";

import api from "./api";

import ProductCard from "./components/ProductCard";

import Admin from "./components/Admin";

const CATEGORIES = [

  "All",

  "Women",

  "Men",

  "Kids",

  "Accessories",

  "Ethnic wear",

];

const SORT_OPTIONS = [

  { value: "featured", label: "Featured" },

  { value: "low", label: "Price: low to high" },

  { value: "high", label: "Price: high to low" },

  { value: "name", label: "Name: A to Z" },

];

const CATEGORY_IMAGES = [

  {

    name: "Women",

    subtitle: "Your everyday edit",

    image:

      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",

  },

  {

    name: "Men",

    subtitle: "Effortless essentials",

    image:

      "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=900&q=85",

  },

  {

    name: "Ethnic wear",

    subtitle: "Tradition, reimagined",

    image:

      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85",

  },

  {

    name: "Accessories",

    subtitle: "The finishing touch",

    image:

      "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85",

  },

];

const money = (value) =>

  `₹${Number(value || 0).toLocaleString("en-IN")}`;

function getProductImages(product) {
  const gallery = Array.isArray(product?.images) ? product.images : [];
  const candidates = [
    ...gallery,
    product?.image,
  ];

  return [...new Set(
    candidates
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item.url === "string") return item.url.trim();
        return "";
      })
      .filter(Boolean)
  )].slice(0, 5);
}

function getProductImage(product) {
  return getProductImages(product)[0] || "";
}

function normalizeProduct(product) {
  const images = getProductImages(product);

  return {
    ...product,
    images,
    // Keep compatibility with components that expect a single product.image.
    image: images[0] || "",
  };
}

function readSaved(key, fallback) {

  try {

    const saved = localStorage.getItem(key);

    return saved ? JSON.parse(saved) : fallback;

  } catch {

    return fallback;

  }

}

function IconButton({ label, onClick, children, className = "" }) {

  return (

    <button

      type="button"

      aria-label={label}

      onClick={onClick}

      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-[#e9ebdf] active:scale-95 ${className}`}

    >

      {children}

    </button>

  );

}

function SkeletonCard() {

  return (

    <div className="overflow-hidden rounded-2xl border border-black/[.05] bg-white p-2.5 sm:rounded-3xl sm:p-3">

      <div className="mudlay-skeleton aspect-[3/4] rounded-xl sm:rounded-2xl" />

      <div className="mudlay-skeleton mt-4 h-3 w-2/3 rounded-full" />

      <div className="mudlay-skeleton mt-3 h-4 w-full rounded-full" />

      <div className="mudlay-skeleton mt-2 h-3 w-1/2 rounded-full" />

      <div className="mudlay-skeleton mt-4 h-10 rounded-xl" />

    </div>

  );

}

function getProductIdFromPath() {
  const match = window.location.pathname.match(/^\/product\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function productOptionList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string" || typeof item === "number") return String(item);
    return String(item?.name || item?.label || item?.value || item?.size || item?.color || "");
  }).filter(Boolean);
}

function SingleProductPage({
  product,
  loading,
  onBack,
  onAdd,
  quantity,
  cartItems = [],
  onChangeQty,
  onFavorite,
  favorite,
  onShare,
  relatedProducts,
  onOpenProduct,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [imageFailed, setImageFailed] = useState({});
  const [imageLoaded, setImageLoaded] = useState({});
  const gallery = useMemo(() => getProductImages(product || {}), [product]);

  useEffect(() => {
    setActiveImageIndex(0);
    setSelectedSize("");
    setSelectedColor("");
    setImageFailed({});
    setImageLoaded({});
  }, [product?._id]);

  const sizes = productOptionList(product?.sizes || product?.availableSizes || product?.sizeOptions);
  const colors = productOptionList(product?.colors || product?.availableColors || product?.colorOptions);
  const currentImage = gallery.length ? gallery[activeImageIndex % gallery.length] : "";
  const stock = Number(product?.stock ?? 0);
  const variantQuantity = cartItems.find((item) =>
    String(item.product?._id) === String(product?._id) &&
    String(item.product?.selectedSize || "") === String(selectedSize || "") &&
    String(item.product?.selectedColor || "") === String(selectedColor || "")
  )?.qty || 0;
  const price = Number(product?.price || 0);
  const originalPrice = Number(product?.originalPrice ?? product?.compareAtPrice ?? 0);
  const hasDiscount = originalPrice > price;
  const discount = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  if (loading && !product) {
    return (
      <div className="mudlay min-h-screen bg-[#f8f7f2] px-4 py-6 sm:px-6 lg:px-10">
        <style>{`.mudlay-skeleton{background:linear-gradient(105deg,#ebeae3 25%,#f8f7f2 45%,#ebeae3 65%);background-size:200% 100%;animation:mudlay-detail-skeleton 1.35s linear infinite}@keyframes mudlay-detail-skeleton{to{background-position:-200% 0}}@media(prefers-reduced-motion:reduce){.mudlay-skeleton{animation:none}}`}</style>
        <div className="mx-auto max-w-[1200px]">
          <div className="mudlay-skeleton h-10 w-32 rounded-full" />
          <div className="mt-7 grid gap-8 lg:grid-cols-2">
            <div className="mudlay-skeleton aspect-[4/5] rounded-[2rem]" />
            <div className="py-2">
              <div className="mudlay-skeleton h-3 w-24 rounded-full" />
              <div className="mudlay-skeleton mt-5 h-10 w-4/5 rounded-xl" />
              <div className="mudlay-skeleton mt-3 h-10 w-2/3 rounded-xl" />
              <div className="mudlay-skeleton mt-7 h-7 w-32 rounded-lg" />
              <div className="mudlay-skeleton mt-7 h-4 w-full rounded-full" />
              <div className="mudlay-skeleton mt-3 h-4 w-5/6 rounded-full" />
              <div className="mudlay-skeleton mt-3 h-4 w-2/3 rounded-full" />
              <div className="mudlay-skeleton mt-8 h-12 w-full rounded-xl" />
              <div className="mudlay-skeleton mt-3 h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mudlay flex min-h-screen flex-col items-center justify-center bg-[#f8f7f2] px-5 text-center text-[#24271f]">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#eceee3]"><LuShoppingBag size={25} /></div>
        <h1 className="mt-5 text-2xl font-black">Product not found</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#85877b]">This product may have been removed or the link may be incorrect.</p>
        <button onClick={onBack} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#283d2d] px-5 py-3 text-sm font-bold text-white"><LuArrowLeft size={16} /> Back to collection</button>
      </div>
    );
  }

  return (
    <div className="mudlay min-h-screen bg-[#f8f7f2]  text-[#24271f]">
      <style>{`.mudlay-scrollbar{scrollbar-width:none}.mudlay-scrollbar::-webkit-scrollbar{display:none}.mudlay-button{transition:transform .2s ease,box-shadow .2s ease}.mudlay-button:active{transform:scale(.98)}`}</style>
      <header className="sticky top-0 z-30 border-b border-black/[.05] bg-[#f8f7f2]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[.08] bg-white px-4 text-xs font-bold transition hover:bg-[#eceee3]"><LuArrowLeft size={16} /> <span>Back</span></button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-left">
            <span className="block text-[23px] font-black leading-none tracking-[-.075em]">mudlay<span className="text-[#82936d]">.</span></span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[.18em] text-[#85877b]">Wear your everyday</span>
          </button>
          <button type="button" onClick={() => onShare(product)} aria-label={`Share ${product.name || "product"}`} className="grid h-10 w-10 place-items-center rounded-full border border-black/[.08] bg-white transition hover:bg-[#eceee3]"><LuShare2 size={18} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-[#85877b] sm:text-xs">
          <button onClick={onBack} className="hover:text-[#283d2d]">Home</button><span>/</span><span>{product.category || "Collection"}</span><span>/</span><span className="max-w-[55vw] truncate text-[#283d2d]">{product.name || "Product"}</span>
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
          <section className="min-w-0">
            <div className="relative overflow-hidden rounded-[1.6rem] bg-[#eceee3] sm:rounded-[2rem]">
              <div className="aspect-[4/5] max-h-[780px] w-full">
                {currentImage && !imageFailed[currentImage] ? (
                  <img key={currentImage} src={currentImage} alt={product.name || "Mudlay product"} onLoad={() => setImageLoaded((old) => ({ ...old, [currentImage]: true }))} onError={() => setImageFailed((old) => ({ ...old, [currentImage]: true }))} className={`h-full w-full object-cover transition-opacity duration-300 ${imageLoaded[currentImage] ? "opacity-100" : "opacity-0"}`} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-[#85877b]"><LuShoppingBag size={38} /><span className="text-xs">Product image unavailable</span></div>
                )}
              </div>
              {hasDiscount && <span className="absolute left-4 top-4 rounded-full bg-[#283d2d] px-3 py-2 text-[10px] font-extrabold text-white">{discount}% OFF</span>}
              {gallery.length > 1 && <>
                <button type="button" aria-label="Previous product image" onClick={() => setActiveImageIndex((index) => (index - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md"><LuChevronLeft size={20} /></button>
                <button type="button" aria-label="Next product image" onClick={() => setActiveImageIndex((index) => (index + 1) % gallery.length)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md"><LuChevronRight size={20} /></button>
              </>}
            </div>
            {gallery.length > 1 && <div className="mudlay-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">{gallery.map((src, index) => <button key={`${src}-${index}`} type="button" aria-label={`View image ${index + 1}`} onClick={() => setActiveImageIndex(index)} className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 sm:h-24 sm:w-20 ${activeImageIndex === index ? "border-[#283d2d]" : "border-transparent"}`}><img src={src} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" /></button>)}</div>}
          </section>

          <section className="min-w-0 lg:sticky lg:top-24">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#82936d]">{product.brand || product.category || "The Mudlay edit"}</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-.055em] sm:text-4xl lg:text-5xl">{product.name || "Untitled product"}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-2xl font-black tracking-tight text-[#283d2d]">{money(price)}</span>
              {hasDiscount && <><span className="text-sm text-[#92958a] line-through">{money(originalPrice)}</span><span className="rounded-full bg-[#e7eddf] px-2.5 py-1 text-[10px] font-extrabold text-[#526b43]">Save {discount}%</span></>}
            </div>
            <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold ${stock > 0 ? "bg-[#e7eddf] text-[#526b43]" : "bg-red-50 text-red-600"}`}><span className={`h-2 w-2 rounded-full ${stock > 0 ? "bg-[#648052]" : "bg-red-500"}`} />{stock > 0 ? (stock <= 5 ? `Only ${stock} left in stock` : "In stock and ready to enquire") : "Currently out of stock"}</p>
            {product.description && <div className="mt-6 border-t border-black/[.07] pt-5"><h2 className="text-sm font-bold">Product details</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#686c61]">{product.description}</p></div>}

            {sizes.length > 0 && <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold">Select size</h2><span className="text-[10px] text-[#85877b]">Choose before enquiring</span></div><div className="flex flex-wrap gap-2">{sizes.map((size) => <button key={size} type="button" onClick={() => setSelectedSize(size)} aria-pressed={selectedSize === size} className={`min-w-11 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${selectedSize === size ? "border-[#283d2d] bg-[#283d2d] text-white" : "border-black/[.1] bg-white hover:border-[#82936d]"}`}>{size}</button>)}</div></div>}
            {colors.length > 0 && <div className="mt-6"><h2 className="mb-3 text-xs font-bold">Select colour</h2><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color} type="button" onClick={() => setSelectedColor(color)} aria-pressed={selectedColor === color} className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${selectedColor === color ? "border-[#283d2d] bg-[#283d2d] text-white" : "border-black/[.1] bg-white hover:border-[#82936d]"}`}>{color}</button>)}</div></div>}

            <div className="mt-7 grid grid-cols-[1fr_auto] gap-3">
              {variantQuantity > 0 ? <div className="flex min-h-12 items-center justify-between rounded-xl border border-[#283d2d]/10 bg-[#e7eddf] p-1"><button type="button" onClick={() => onChangeQty(product._id, -1, selectedSize, selectedColor)} aria-label="Decrease quantity" className="grid h-10 w-12 place-items-center rounded-lg bg-white"><LuMinus size={16} /></button><span className="text-sm font-black">{variantQuantity}</span><button type="button" onClick={() => onAdd({ ...product, selectedSize, selectedColor })} aria-label="Increase quantity" disabled={stock <= variantQuantity} className="grid h-10 w-12 place-items-center rounded-lg bg-[#283d2d] text-white disabled:opacity-40"><LuPlus size={16} /></button></div> : <button type="button" onClick={() => onAdd({ ...product, selectedSize, selectedColor })} disabled={stock <= 0} className="mudlay-button flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#283d2d] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><LuShoppingBag size={17} /> Add to bag</button>}
              <button type="button" onClick={() => onFavorite(product._id)} aria-pressed={favorite} aria-label={favorite ? "Remove from wishlist" : "Add to wishlist"} className={`grid h-12 w-12 place-items-center rounded-xl border transition ${favorite ? "border-rose-200 bg-rose-50 text-rose-500" : "border-black/[.1] bg-white hover:bg-[#eceee3]"}`}><LuHeart size={19} fill={favorite ? "#f43f5e" : "none"} /></button>
            </div>
            <button type="button" onClick={() => onShare(product)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/[.1] bg-white text-sm font-bold transition hover:bg-[#eceee3]"><LuShare2 size={17} /> Share this product</button>
            <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-black/[.06] bg-white p-4"><LuMessageCircle size={18} className="text-[#526b43]" /><p className="mt-2 text-xs font-bold">Personal assistance</p><p className="mt-1 text-[10px] leading-5 text-[#85877b]">Ask us about fit, size and availability.</p></div><div className="rounded-2xl border border-black/[.06] bg-white p-4"><LuTruck size={18} className="text-[#526b43]" /><p className="mt-2 text-xs font-bold">Delivery details</p><p className="mt-1 text-[10px] leading-5 text-[#85877b]">Delivery charges confirmed by the shop.</p></div></div>
          </section>
        </div>

        {relatedProducts.length > 0 && <section className="mt-14 border-t border-black/[.06] pt-9"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#82936d]">More to discover</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">You may also like.</h2></div><button type="button" onClick={onBack} className="text-xs font-bold underline underline-offset-4">Shop all</button></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{relatedProducts.slice(0, 4).map((item) => { const photo = getProductImage(item); return <button key={item._id} type="button" onClick={() => onOpenProduct(item)} className="overflow-hidden rounded-2xl border border-black/[.06] bg-white text-left transition hover:-translate-y-1"><div className="aspect-[4/5] bg-[#eceee3]"><img src={photo || undefined} alt={item.name || "Product"} loading="lazy" className="h-full w-full object-cover" /></div><div className="p-3"><p className="line-clamp-2 text-xs font-bold">{item.name}</p><p className="mt-2 text-sm font-black text-[#283d2d]">{money(item.price)}</p></div></button>; })}</div></section>}
      </main>
      <footer className="mt-10 bg-[#202d22] px-4 py-7 text-center text-[10px] text-white/60">© {new Date().getFullYear()} Mudlay. All rights reserved.</footer>
    </div>
  );
}

export default function App() {

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [apiError, setApiError] = useState("");

  const [query, setQuery] = useState("");

  const [category, setCategory] = useState("All");

  const [sort, setSort] = useState("featured");

  const [minPrice, setMinPrice] = useState("");

  const [maxPrice, setMaxPrice] = useState("");

  const [inStockOnly, setInStockOnly] = useState(false);

  const [cart, setCart] = useState(() =>

    readSaved("mudlay.cart.v1", [])

  );

  const [favorites, setFavorites] = useState(() =>

    readSaved("mudlay.favorites.v1", [])

  );

  const [view, setView] = useState("shop");

  const [cartOpen, setCartOpen] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [notice, setNotice] = useState("");

  const [showTop, setShowTop] = useState(false);

  const [navHidden, setNavHidden] = useState(false);

  const [adminOpen, setAdminOpen] = useState(
    window.location.pathname === "/admin"
  );
  const [selectedProductId, setSelectedProductId] = useState(() => getProductIdFromPath());

  const whatsapp = (

    import.meta.env.VITE_WHATSAPP_NUMBER || ""

  ).replace(/\D/g, "");

  useEffect(() => {

    AOS.init({

      duration: 650,

      once: true,

      offset: 35,

      easing: "ease-out-cubic",

      disable: window.matchMedia(

        "(prefers-reduced-motion: reduce)"

      ).matches,

    });

  }, []);

  useEffect(() => {

    try {

      localStorage.setItem("mudlay.cart.v1", JSON.stringify(cart));

      localStorage.setItem(

        "mudlay.favorites.v1",

        JSON.stringify(favorites)

      );

    } catch (error) {

      console.warn("Could not save Mudlay shopping data.", error);

    }

  }, [cart, favorites]);

  useEffect(() => {

    let active = true;

    api

      .get("/products")

      .then(({ data }) => {

        if (!active) return;

        const list = Array.isArray(data?.products)

          ? data.products

          : Array.isArray(data)

            ? data

            : [];

        // The API product document can contain both `image` and `images`.
        // Normalize both fields so the store, ProductCard, and saved cart agree.
        const normalizedProducts = list.map(normalizeProduct);

        setProducts(normalizedProducts);
        setApiError("");

        setCart((current) =>
          current
            .map((item) => {
              const fresh = normalizedProducts.find(
                (product) =>
                  String(product._id) === String(item.product?._id)
              );

              return fresh ? { ...item, product: fresh } : item;
            })
            .filter((item) =>
              normalizedProducts.some(
                (product) =>
                  String(product._id) === String(item.product?._id)
              )
            )
        );

      })

      .catch((error) => {

        console.error("Unable to fetch products:", error);

        if (active) {

          setApiError(

            "We couldn't load the collection. Check your connection and try again."

          );

        }

      })

      .finally(() => {

        if (active) setLoading(false);

      });

    return () => {

      active = false;

    };

  }, []);

  useEffect(() => {

    let previousScrollY = window.scrollY;

    const onScroll = () => {

      const currentScrollY = window.scrollY;

      const difference = currentScrollY - previousScrollY;

      setShowTop(currentScrollY > 450);

      // Keep the navbar visible near the top, hide while scrolling down,
      // and reveal it again as soon as the user scrolls up.
      if (currentScrollY < 80) {

        setNavHidden(false);

      } else if (difference > 4) {

        setNavHidden(true);

      } else if (difference < -4) {

        setNavHidden(false);

      }

      previousScrollY = currentScrollY;

    };

    const onPopState = () => {
      setAdminOpen(window.location.pathname === "/admin");
      setSelectedProductId(getProductIdFromPath());
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("popstate", onPopState);

    return () => {

      window.removeEventListener("scroll", onScroll);

      window.removeEventListener("popstate", onPopState);

    };

  }, []);

  useEffect(() => {

    document.body.style.overflow =

      cartOpen || filterOpen ? "hidden" : "";

    return () => {

      document.body.style.overflow = "";

    };

  }, [cartOpen, filterOpen]);

  useEffect(() => {

    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(""), 2500);

    return () => window.clearTimeout(timeout);

  }, [notice]);

  useEffect(() => {

    AOS.refresh();

  }, [products, loading, view]);

  function scrollTo(id) {

    document.getElementById(id)?.scrollIntoView({

      behavior: "smooth",

      block: "start",

    });

  }

  function goAdmin() {

    window.history.pushState({}, "", "/admin");

    setAdminOpen(true);
    setSelectedProductId(null);
    window.scrollTo(0, 0);

  }

  function goStore() {

    window.history.pushState({}, "", "/");

    setAdminOpen(false);
    setSelectedProductId(null);
    window.scrollTo(0, 0);

  }

  function openProduct(product) {
    if (!product?._id) return;
    const path = `/product/${encodeURIComponent(String(product._id))}`;
    window.history.pushState({}, "", path);
    setAdminOpen(false);
    setSelectedProductId(String(product._id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {

    setQuery("");

    setCategory("All");

    setSort("featured");

    setMinPrice("");

    setMaxPrice("");

    setInStockOnly(false);

  }

  function chooseCategory(value) {

    setCategory(value);

    setView("shop");

    setMobileMenu(false);

    scrollTo("shop");

  }

  const filtered = useMemo(() => {

    const term = query.trim().toLowerCase();

    const minimum = minPrice === "" ? null : Number(minPrice);

    const maximum = maxPrice === "" ? null : Number(maxPrice);

    const result = products.filter((product) => {

      const productCategory = String(

        product.category || ""

      ).toLowerCase();

      const matchesCategory =

        category === "All" ||

        productCategory === category.toLowerCase();

      const text = [

        product.name,

        product.category,

        product.description,

        product.brand,

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      const price = Number(product.price || 0);

      const stock = Number(product.stock ?? 0);

      return (

        (view !== "favorites" ||

          favorites.some(

            (id) => String(id) === String(product._id)

          )) &&

        matchesCategory &&

        text.includes(term) &&

        (minimum === null || price >= minimum) &&

        (maximum === null || price <= maximum) &&

        (!inStockOnly || stock > 0)

      );

    });

    if (sort === "low") {

      result.sort((a, b) => Number(a.price) - Number(b.price));

    } else if (sort === "high") {

      result.sort((a, b) => Number(b.price) - Number(a.price));

    } else if (sort === "name") {

      result.sort((a, b) =>

        String(a.name || "").localeCompare(String(b.name || ""))

      );

    }

    return result;

  }, [

    products,

    query,

    category,

    sort,

    minPrice,

    maxPrice,

    inStockOnly,

    favorites,

    view,

  ]);

  const cartCount = cart.reduce(

    (total, item) => total + Number(item.qty || 0),

    0

  );

  const cartTotal = cart.reduce(

    (total, item) =>

      total +

      Number(item.product?.price || 0) * Number(item.qty || 0),

    0

  );

  const activeFilters =

    Number(category !== "All") +

    Number(sort !== "featured") +

    Number(minPrice !== "") +

    Number(maxPrice !== "") +

    Number(inStockOnly);

  function add(product) {

    if (Number(product.stock ?? 0) <= 0) {

      setNotice("This product is currently unavailable.");

      return;

    }

    setCart((current) => {

      const existing = current.find((item) =>
        String(item.product._id) === String(product._id) &&
        String(item.product.selectedSize || "") === String(product.selectedSize || "") &&
        String(item.product.selectedColor || "") === String(product.selectedColor || "")
      );

      if (existing) {

        return current.map((item) => {
          const sameProduct = String(item.product._id) === String(product._id);
          const sameSize = String(item.product.selectedSize || "") === String(product.selectedSize || "");
          const sameColor = String(item.product.selectedColor || "") === String(product.selectedColor || "");
          return sameProduct && sameSize && sameColor
            ? { ...item, product, qty: Math.min(99, Number(item.qty || 0) + 1) }
            : item;
        });

      }

      return [...current, { product, qty: 1 }];

    });

    setNotice("Added to your bag");

  }

  function changeQty(id, difference, selectedSize = null, selectedColor = null) {

    setCart((current) =>

      current

        .map((item) => {

          const sameProduct = String(item.product._id) === String(id);
          const sameSize = selectedSize === null
            ? !item.product.selectedSize
            : String(item.product.selectedSize || "") === String(selectedSize || "");
          const sameColor = selectedColor === null
            ? !item.product.selectedColor
            : String(item.product.selectedColor || "") === String(selectedColor || "");
          if (!sameProduct || !sameSize || !sameColor) {

            return item;

          }

          return {

            ...item,

            qty: Math.max(

              0,

              Math.min(99, Number(item.qty || 0) + difference)

            ),

          };

        })

        .filter((item) => item.qty > 0)

    );

  }

  function toggleFavorite(id) {

    const exists = favorites.some(

      (item) => String(item) === String(id)

    );

    setFavorites((current) =>

      exists

        ? current.filter((item) => String(item) !== String(id))

        : [...current, id]

    );

    setNotice(exists ? "Removed from wishlist" : "Saved to wishlist");

  }

  async function shareProduct(product) {
    const productUrl = product?._id
      ? `${window.location.origin}/product/${encodeURIComponent(String(product._id))}`
      : `${window.location.origin}/`;
    const productName = String(product?.name || "Mudlay product");
    const productPrice = money(product?.price);
    const shareData = {
      title: `${productName} | Mudlay`,
      text: `Check out ${productName} at Mudlay for ${productPrice}.`,
      url: productUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      const message = `${shareData.text}\n${shareData.url}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        setNotice("Product details copied to clipboard");
      } else {
        window.prompt("Copy this product share message:", message);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Unable to share product:", error);
        setNotice("Couldn't share this product. Please try again.");
      }
    }
  }

  function checkout() {

    if (!cart.length) return;

    if (whatsapp.length < 10) {

      setNotice("Add your shop WhatsApp number to the .env file.");

      return;

    }

    const items = cart

      .map(

        ({ product, qty }) =>

          `• ${product.name}${[product.selectedSize ? `Size: ${product.selectedSize}` : "", product.selectedColor ? `Colour: ${product.selectedColor}` : ""].filter(Boolean).length ? ` (${[product.selectedSize ? `Size: ${product.selectedSize}` : "", product.selectedColor ? `Colour: ${product.selectedColor}` : ""].filter(Boolean).join(", ")})` : ""} × ${qty} — ${money(

            Number(product.price) * qty

          )}`

      )

      .join("\n");

    const message = [

      "Hello Mudlay! I'd like to enquire about these products:",

      "",

      items,

      "",

      `Estimated subtotal: ${money(cartTotal)}`,

      "",

      "Please confirm availability, sizes, delivery charges and the final amount.",

    ].join("\n");

    window.open(

      `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`,

      "_blank",

      "noopener,noreferrer"

    );

  }

  if (adminOpen) return <Admin onBack={goStore} />;

  const selectedProduct = selectedProductId
    ? products.find((item) => String(item._id) === String(selectedProductId)) || null
    : null;
  if (selectedProductId) {
    const relatedProducts = products.filter((item) =>
      String(item._id) !== String(selectedProductId) &&
      (!selectedProduct?.category || item.category === selectedProduct.category)
    );
    return (
      <SingleProductPage
        product={selectedProduct}
        loading={loading}
        onBack={goStore}
        onAdd={add}
        quantity={0}
        cartItems={cart}
        onChangeQty={changeQty}
        onFavorite={toggleFavorite}
        favorite={favorites.some((id) => String(id) === String(selectedProductId))}
        onShare={shareProduct}
        relatedProducts={relatedProducts.length ? relatedProducts : products.filter((item) => String(item._id) !== String(selectedProductId))}
        onOpenProduct={openProduct}
      />
    );
  }

  // Keep the whole storefront in a matching skeleton state while products load.
  if (loading) {
    return (
      <div
        className="min-h-screen overflow-x-clip bg-[#f8f7f2] pb-8 text-[#24271f]"
        aria-busy="true"
        aria-label="Loading Mudlay storefront"
      >
        <style>{`
          .mudlay-skeleton {
            background: linear-gradient(105deg, #ebeae3 25%, #f8f7f2 45%, #ebeae3 65%);
            background-size: 200% 100%;
            animation: mudlay-skeleton-loading 1.35s linear infinite;
          }
          @keyframes mudlay-skeleton-loading {
            to { background-position: -200% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .mudlay-skeleton { animation: none; }
          }
        `}</style>

        <div className="border-b border-black/[.05] bg-[#f8f7f2] px-4 py-3 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="mudlay-skeleton h-10 w-10 rounded-xl sm:h-12 sm:w-12" />
              <div>
                <div className="mudlay-skeleton h-6 w-28 rounded-full sm:w-32" />
                <div className="mudlay-skeleton mt-2 h-2.5 w-24 rounded-full" />
              </div>
            </div>
            <div className="hidden items-center gap-5 lg:flex">
              <div className="mudlay-skeleton h-3 w-14 rounded-full" />
              <div className="mudlay-skeleton h-3 w-20 rounded-full" />
              <div className="mudlay-skeleton h-3 w-16 rounded-full" />
              <div className="mudlay-skeleton h-10 w-28 rounded-full" />
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="mudlay-skeleton h-10 w-10 rounded-full" />
              <div className="mudlay-skeleton h-10 w-20 rounded-full" />
            </div>
          </div>
        </div>

        <main>
          <section className="bg-[#e7e7dd] p-4 sm:p-6 lg:p-10">
            <div className="mudlay-skeleton mx-auto flex min-h-[420px] max-w-[1480px] flex-col justify-between rounded-[2rem] p-6 sm:min-h-[540px] sm:p-10 lg:min-h-[650px] lg:p-14">
              <div className="mudlay-skeleton h-8 w-40 rounded-full" />
              <div className="max-w-2xl">
                <div className="mudlay-skeleton h-3 w-36 rounded-full" />
                <div className="mudlay-skeleton mt-5 h-14 w-[85%] rounded-2xl sm:h-20" />
                <div className="mudlay-skeleton mt-3 h-14 w-[62%] rounded-2xl sm:h-20" />
                <div className="mudlay-skeleton mt-5 h-4 w-full max-w-md rounded-full" />
                <div className="mudlay-skeleton mt-2 h-4 w-4/5 max-w-sm rounded-full" />
                <div className="mt-7 flex gap-3">
                  <div className="mudlay-skeleton h-12 w-40 rounded-full" />
                  <div className="mudlay-skeleton h-12 w-36 rounded-full" />
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-black/[.05] bg-white">
            <div className="mx-auto grid max-w-[1480px] grid-cols-2 gap-3 px-4 py-5 sm:px-6 md:grid-cols-4 lg:px-10">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-2 sm:p-3">
                  <div className="mudlay-skeleton h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="mudlay-skeleton h-3 w-3/4 rounded-full" />
                    <div className="mudlay-skeleton mt-2 h-2.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-[1480px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <div className="mudlay-skeleton h-3 w-36 rounded-full" />
            <div className="mudlay-skeleton mt-3 h-10 w-64 max-w-full rounded-xl sm:h-12 sm:w-80" />
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="mudlay-skeleton h-[190px] rounded-2xl sm:h-[290px] sm:rounded-3xl lg:h-[340px]" />
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-[1480px] px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10">
            <div className="mudlay-skeleton h-3 w-32 rounded-full" />
            <div className="mudlay-skeleton mt-3 h-10 w-60 max-w-full rounded-xl sm:h-12 sm:w-72" />
            <div className="mudlay-skeleton mt-4 h-4 w-64 max-w-full rounded-full" />
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <div className="mudlay-skeleton h-[54px] flex-1 rounded-2xl" />
              <div className="mudlay-skeleton h-[54px] w-full rounded-2xl sm:w-44" />
            </div>
            <div className="mt-4 flex gap-2 overflow-hidden">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="mudlay-skeleton h-10 w-20 shrink-0 rounded-full sm:w-24" />
              ))}
            </div>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          </section>

          <section className="bg-[#283d2d] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
            <div className="mx-auto grid max-w-[1480px] items-center gap-8 md:grid-cols-2 lg:gap-14">
              <div className="mudlay-skeleton h-[300px] rounded-[2rem] sm:h-[430px]" />
              <div>
                <div className="mudlay-skeleton h-8 w-40 rounded-full" />
                <div className="mudlay-skeleton mt-6 h-12 w-4/5 rounded-xl sm:h-16" />
                <div className="mudlay-skeleton mt-3 h-12 w-3/5 rounded-xl sm:h-16" />
                <div className="mudlay-skeleton mt-6 h-4 w-full rounded-full" />
                <div className="mudlay-skeleton mt-3 h-4 w-5/6 rounded-full" />
                <div className="mudlay-skeleton mt-3 h-4 w-2/3 rounded-full" />
                <div className="mudlay-skeleton mt-7 h-12 w-44 rounded-full" />
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-[1480px] gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 lg:px-10">
            <div>
              <div className="mudlay-skeleton h-3 w-36 rounded-full" />
              <div className="mudlay-skeleton mt-4 h-10 w-64 max-w-full rounded-xl sm:h-12" />
              <div className="mudlay-skeleton mt-5 h-4 w-full max-w-md rounded-full" />
              <div className="mudlay-skeleton mt-3 h-4 w-4/5 max-w-sm rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="mudlay-skeleton h-24 rounded-2xl" />
              <div className="mudlay-skeleton h-24 rounded-2xl" />
            </div>
          </section>
        </main>
        <footer className="bg-[#202d22] px-4 py-9 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
            <div className="mudlay-skeleton h-10 w-36 rounded-xl" />
            <div className="mudlay-skeleton h-3 w-32 rounded-full" />
          </div>
        </footer>
      </div>
    );
  }

  return (

    <div className="mudlay min-h-screen overflow-x-clip bg-[#f8f7f2]  text-[#24271f] md:pb-0">

      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 100px;
          -webkit-tap-highlight-color: transparent;
        }

        .mudlay {
          --forest: #283d2d;
          --sage: #82936d;
          --cream: #f8f7f2;
          --pale: #eceee3;
          --shine: rgba(255, 255, 255, .72);
        }

        .mudlay * { box-sizing: border-box; }

        /* A soft editorial light sweep, never blocking taps or scrolling. */
        .mudlay::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 30;
          pointer-events: none;
          opacity: .09;
          background: linear-gradient(115deg, transparent 0%, transparent 44%,
            rgba(255,255,255,.82) 50%, transparent 56%, transparent 100%);
          background-size: 260% 100%;
          background-repeat: no-repeat;
          animation: mudlay-page-shine 18s ease-in-out infinite;
        }

        @keyframes mudlay-page-shine {
          0%, 12% { background-position: 150% 0; }
          62%, 100% { background-position: -150% 0; }
        }

        .mudlay-hero {
          isolation: isolate;
          background:
            radial-gradient(ellipse at 78% 22%, rgba(220,230,197,.20), transparent 36%),
            #152319;
        }

        .mudlay-hero::after {
          content: "";
          position: absolute;
          z-index: 1;
          inset: -30% auto -30% -55%;
          width: 34%;
          pointer-events: none;
          transform: rotate(18deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.17), transparent);
          animation: mudlay-hero-glint 9s ease-in-out infinite;
        }

        .mudlay-hero-image {
          animation: mudlay-hero-drift 24s ease-in-out infinite alternate;
          will-change: transform;
        }

        @keyframes mudlay-hero-glint {
          0%, 22% { left: -55%; opacity: 0; }
          35% { opacity: 1; }
          58%, 100% { left: 125%; opacity: 0; }
        }

        @keyframes mudlay-hero-drift {
          from { transform: scale(1.015); }
          to { transform: scale(1.075); }
        }

        .mudlay-skeleton {
          background: linear-gradient(105deg, #ebeae3 25%, #f8f7f2 45%, #ebeae3 65%);
          background-size: 200% 100%;
          animation: mudlay-skeleton 1.35s linear infinite;
        }

        .mudlay-shine {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }

        .mudlay-shine::after {
          content: "";
          position: absolute;
          z-index: 2;
          top: -100%;
          bottom: -100%;
          left: -70%;
          width: 30%;
          transform: rotate(22deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.38), transparent);
          animation: mudlay-shimmer 7s ease-in-out infinite;
          pointer-events: none;
        }

        .mudlay-button {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transition: transform .24s cubic-bezier(.2,.7,.2,1),
            box-shadow .24s ease, background .24s ease;
        }

        .mudlay-button::after {
          content: "";
          position: absolute;
          z-index: -1;
          inset: -20% auto -20% -75%;
          width: 45%;
          transform: skewX(-22deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
          transition: left .65s ease;
          pointer-events: none;
        }

        .mudlay-button:hover::after { left: 140%; }
        .mudlay-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(40,61,45,.16);
        }
        .mudlay-button:active { transform: translateY(0) scale(.98); }

        .mudlay-category-image {
          transition: transform .8s cubic-bezier(.2,.7,.2,1), filter .5s ease;
        }
        .mudlay-category:hover .mudlay-category-image {
          transform: scale(1.065);
          filter: saturate(1.08);
        }

        .mudlay-product-shell {
          position: relative;
          isolation: isolate;
          border-radius: 1.25rem;
          transition: transform .28s cubic-bezier(.2,.7,.2,1),
            box-shadow .28s ease, background .28s ease;
        }
        .mudlay-product-shell::after {
          content: "";
          position: absolute;
          z-index: 4;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.42) 48%,
            transparent 63%);
          background-size: 240% 100%;
          background-position: 140% 0;
          transition: opacity .25s ease;
        }
        .mudlay-product-shell:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(40,61,45,.09);
        }
        .mudlay-product-shell:hover::after {
          opacity: 1;
          animation: mudlay-card-glint 1.15s ease-out both;
        }
        @keyframes mudlay-card-glint {
          from { background-position: 140% 0; }
          to { background-position: -140% 0; }
        }

        .mudlay-overlay { animation: mudlay-fade .2s ease-out both; }
        .mudlay-drawer { animation: mudlay-slide .25s ease-out both; }
        .mudlay-scrollbar { scrollbar-width: none; }
        .mudlay-scrollbar::-webkit-scrollbar { display: none; }

        @keyframes mudlay-skeleton { to { background-position: -200% 0; } }
        @keyframes mudlay-shimmer {
          0%, 18% { left: -70%; }
          55%, 100% { left: 140%; }
        }
        @keyframes mudlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mudlay-slide {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 640px) {
          .mudlay-product-shell { border-radius: 1rem; }
          .mudlay-product-shell:hover { transform: none; box-shadow: none; }
          .mudlay-hero-image { animation-duration: 32s; }
          .mudlay::after { opacity: .045; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mudlay::after,
          .mudlay-shine::after,
          .mudlay-hero::after,
          .mudlay-hero-image,
          .mudlay-skeleton,
          .mudlay-product-shell::after {
            animation: none !important;
          }
          .mudlay *, .mudlay *::before, .mudlay *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* Announcement strip */}

      <div className="mudlay-shine bg-[#283d2d] px-3 py-2.5 text-center text-[7px] font-semibold uppercase tracking-[.17em] text-white sm:text-[10px]">

        <span className="relative z-10">

          <LuSparkles className="mr-2 inline-block" size={12} />

          A little something for your everyday

          <span className="mx-2 text-[#d8e3bd]">✳</span>

          Explore the collection

        </span>

      </div>

      {/* Header */}

      <header
        className={`sticky top-0 z-40 border-b border-black/[.05] bg-[#f8f7f2]/95 backdrop-blur-xl transition-transform duration-300 ease-out will-change-transform ${
          navHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >

        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">

          <a

            href="#home"

            onClick={(event) => {

              event.preventDefault();

              window.scrollTo({ top: 0, behavior: "smooth" });

            }}

            className="flex shrink-0 items-center gap-2.5"

          >

            <img

              src="/logo.png"

              alt="Mudlay"

              onError={(event) => {

                event.currentTarget.style.display = "none";

              }}

              className="h-10 w-10 rounded-xl object-contain sm:h-12 sm:w-12"

            />

            <span>

              <span className="block text-[23px] font-black leading-none tracking-[-.075em] sm:text-[27px]">

                mudlay<span className="text-[#82936d]">.</span>

              </span>

              <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[.18em] text-[#85877b]">

                Wear your everyday

              </span>

            </span>

          </a>

          <nav className="hidden items-center gap-7 text-[12px] font-semibold text-[#55594f] lg:flex">

            <a href="#shop" onClick={() => setView("shop")} className="transition hover:text-[#82936d]">

              Shop all

            </a>

            <a href="#categories" className="transition hover:text-[#82936d]">

              Categories

            </a>

            <a href="#story" className="transition hover:text-[#82936d]">

              Our story

            </a>

            <a href="#contact" className="transition hover:text-[#82936d]">

              Contact

            </a>

          </nav>

          <div className="flex items-center gap-1 sm:gap-2">

            <label className="hidden items-center gap-2 rounded-full border border-black/[.08] bg-white px-3.5 py-2.5 xl:flex">

              <LuSearch size={16} className="text-gray-400" />

              <input

                value={query}

                onChange={(event) => {

                  setQuery(event.target.value);

                  setView("shop");

                }}

                placeholder="Find your style..."

                aria-label="Search products"

                className="w-32 bg-transparent text-xs outline-none focus:w-40"

              />

            </label>

            <IconButton

              label="Wishlist"

              onClick={() => {

                setView("favorites");

                setCategory("All");

                scrollTo("shop");

              }}

            >

              <span className="relative">

                <LuHeart size={19} />

                {favorites.length > 0 && (

                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] text-white">

                    {favorites.length}

                  </span>

                )}

              </span>

            </IconButton>

            <button

              type="button"

              onClick={() => setCartOpen(true)}

              className="mudlay-button inline-flex h-10 items-center gap-2 rounded-full bg-[#283d2d] px-3.5 text-xs font-bold text-white sm:px-4"

            >

              <LuShoppingBag size={17} />

              <span className="hidden sm:inline">Your bag</span>

              {cartCount > 0 && (

                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#dce6c5] px-1 text-[10px] font-black text-[#283d2d]">

                  {cartCount}

                </span>

              )}

            </button>
{/* 
            <IconButton

              label="Toggle menu"

              onClick={() => setMobileMenu((value) => !value)}

              className="lg:hidden"

            >

              {mobileMenu ? <LuX size={20} /> : <LuMenu size={20} />}

            </IconButton> */}

          </div>

        </div>

        {mobileMenu && (

          <div className="border-t border-black/[.06] bg-[#f8f7f2] p-4 lg:hidden">

            <label className="mb-3 flex h-12 items-center gap-3 rounded-xl border border-black/[.08] bg-white px-3">

              <LuSearch size={17} className="text-gray-400" />

              <input

                value={query}

                onChange={(event) => {

                  setQuery(event.target.value);

                  setView("shop");

                }}

                placeholder="Search products..."

                className="w-full bg-transparent text-sm outline-none"

              />

            </label>

            <div className="grid grid-cols-2 gap-2">

              {[

                ["Shop all", "shop"],

                ["Categories", "categories"],

                ["Our story", "story"],

                ["Contact", "contact"],

              ].map(([label, id]) => (

                <a

                  key={id}

                  href={`#${id}`}

                  onClick={() => {

                    setMobileMenu(false);

                    if (id === "shop") setView("shop");

                  }}

                  className="rounded-xl bg-white p-3.5 text-sm font-semibold"

                >

                  {label}

                </a>

              ))}

            </div>

          </div>

        )}

      </header>

      <main id="home">

        {/* Editorial hero — image-first, bottom-aligned copy */}
        <section className="mudlay-hero relative isolate min-h-[610px] overflow-hidden bg-[#152319] text-white sm:min-h-[700px] lg:min-h-[760px]">
          <img
            src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=2200&q=90"
            alt="Contemporary everyday fashion editorial"
            fetchPriority="high"
            className="mudlay-hero-image absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#152319]/95 via-[#152319]/45 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#152319]/45 via-transparent to-transparent" />

          <div className="relative mx-auto flex min-h-[610px] max-w-[1480px] flex-col justify-between px-4 pb-8 pt-7 sm:min-h-[700px] sm:px-6 sm:pb-12 sm:pt-9 lg:min-h-[760px] lg:px-10 lg:pb-16">
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/15 px-3.5 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-white/90 backdrop-blur-md sm:text-[10px]">
                <span className="h-2 w-2 rounded-full bg-[#dce6c5]" />
                The everyday collection
              </span>

              <button
                type="button"
                aria-label="Open wishlist"
                onClick={() => {
                  setView("favorites");
                  setCategory("All");
                  scrollTo("shop");
                }}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/15 text-white backdrop-blur-md transition hover:bg-white/15 active:scale-95"
              >
                <LuHeart size={19} />
              </button>
            </div>

            <div data-aos="fade-up" className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#e0e8d0] sm:text-xs">
                <LuSparkles size={15} />
                Simple pieces. Personal style.
              </p>

              <h1 className="max-w-3xl text-[clamp(3.4rem,9vw,8.2rem)] font-black leading-[.88] tracking-[-.085em]">
                Made for
                <br />
                your{" "}
                <span className="font-serif font-normal italic text-[#dce6c5]">
                  everyday.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-6 text-white/80 sm:mt-6 sm:text-base sm:leading-7">
                Easy-to-wear favourites, thoughtful details and styles that feel
                like you. Find your next everyday favourite with Mudlay.
              </p>

              <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
                <a
                  href="#shop"
                  onClick={() => setView("shop")}
                  className="mudlay-button inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#dce6c5] px-6 py-3.5 text-xs font-bold text-[#283d2d] sm:text-sm"
                >
                  Shop the collection <LuArrowRight size={17} />
                </a>
                <a
                  href="#categories"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-white/10 px-5 py-3.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm"
                >
                  Explore categories
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-[10px] font-medium text-white/80 sm:mt-9 sm:text-xs">
                <span className="inline-flex items-center gap-2">
                  <LuShieldCheck size={15} className="text-[#dce6c5]" />
                  Personal shopping
                </span>
                <span className="inline-flex items-center gap-2">
                  <LuMessageCircle size={15} className="text-[#dce6c5]" />
                  Easy WhatsApp enquiries
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-3 text-[9px] font-semibold uppercase tracking-[.18em] text-white/65 xl:flex">
            <span className="h-px w-10 bg-white/50" />
            The Mudlay edit
          </div>
        </section>

        {/* Service highlights */}

        <section className="border-y border-black/[.05] bg-white">

          <div className="mx-auto grid max-w-[1480px] grid-cols-2 gap-3 px-4 py-5 sm:px-6 md:grid-cols-4 lg:px-10">

            {[

              {

                Icon: LuSparkles,

                title: "Curated collection",

                sub: "Find your everyday look",

              },

              {

                Icon: LuMessageCircle,

                title: "Easy enquiries",

                sub: "Chat with the shop",

              },

              {

                Icon: LuTruck,

                title: "Delivery details",

                sub: "Confirm before ordering",

              },

              {

                Icon: LuShieldCheck,

                title: "Order assistance",

                sub: "Get help with your order",

              },

            ].map(({ Icon, title, sub }, index) => (

              <div

                key={title}

                data-aos="fade-up"

                data-aos-delay={index * 50}

                className="flex items-center gap-3 rounded-xl p-2 sm:p-3"

              >

                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eceee3] text-[#526b43] sm:h-12 sm:w-12">

                  <Icon size={19} />

                </span>

                <span>

                  <span className="block text-[10px] font-bold sm:text-sm">{title}</span>

                  <span className="mt-1 block text-[9px] leading-4 text-[#85877b] sm:text-xs">{sub}</span>

                </span>

              </div>

            ))}

          </div>

        </section>

        {/* Categories */}

        <section id="categories" className="mx-auto max-w-[1480px] scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">

          <div data-aos="fade-up" className="flex items-end justify-between gap-4">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#82936d]">

                Find your favourites

              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-5xl">

                Shop by{" "}

                <span className="font-serif font-normal italic text-[#82936d]">

                  category.

                </span>

              </h2>

            </div>

            <button

              type="button"

              onClick={() => chooseCategory("All")}

              className="hidden text-xs font-bold underline underline-offset-4 sm:block"

            >

              View everything

            </button>

          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

            {CATEGORY_IMAGES.map((item, index) => (

              <button

                type="button"

                key={item.name}

                onClick={() => chooseCategory(item.name)}

                data-aos="fade-up"

                data-aos-delay={index * 55}

                className="mudlay-category group relative isolate overflow-hidden rounded-2xl bg-[#e5e4db] text-left sm:rounded-3xl"

              >

                <div className="mudlay-shine">

                  <img

                    src={item.image}

                    alt={item.name}

                    loading="lazy"

                    className="mudlay-category-image h-[190px] w-full object-cover sm:h-[290px] lg:h-[340px]"

                  />

                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-5">

                  <p className="text-lg font-black sm:text-2xl">{item.name}</p>

                  <p className="mt-1 text-[9px] text-white/80 sm:text-xs">{item.subtitle}</p>

                  <span className="mt-3 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider sm:text-[10px]">

                    Explore <LuArrowRight size={13} />

                  </span>

                </div>

              </button>

            ))}

          </div>

        </section>

        {/* Products */}

        <section id="shop" className="mx-auto max-w-[1480px] scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10">

          <div data-aos="fade-up" className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#82936d]">

                {view === "favorites" ? "Your saved edit" : "Selected for you"}

              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-5xl">

                {view === "favorites" ? (

                  "Your favourites."

                ) : (

                  <>

                    The good{" "}

                    <span className="font-serif font-normal italic text-[#82936d]">

                      stuff.

                    </span>

                  </>

                )}

              </h2>

              <p className="mt-3 max-w-xl text-xs leading-6 text-[#85877b] sm:text-sm">

                Browse the collection and find something that feels like you.

              </p>

            </div>

            <p className="text-xs text-[#85877b]">

              <strong className="text-[#283d2d]">{filtered.length}</strong>{" "}

              {filtered.length === 1 ? "product" : "products"}

            </p>

          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">

            <label className="relative min-w-0 flex-1">

              <LuSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9b9d91]" />

              <input

                value={query}

                onChange={(event) => {

                  setQuery(event.target.value);

                  setView("shop");

                }}

                placeholder="Search products, categories, styles..."

                aria-label="Search products"

                className="h-[54px] w-full rounded-2xl border border-black/[.07] bg-white pl-12 pr-4 text-sm outline-none transition focus:border-[#82936d] focus:ring-4 focus:ring-[#82936d]/10"

              />

            </label>

            <button

              type="button"

              onClick={() => setFilterOpen(true)}

              className="mudlay-button inline-flex h-[54px] items-center justify-center gap-3 rounded-2xl bg-[#283d2d] px-5 text-sm font-bold text-white"

            >

              <LuSlidersHorizontal size={18} />

              Filters & sort

              {activeFilters > 0 && (

                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#dce6c5] px-1 text-[10px] font-black text-[#283d2d]">

                  {activeFilters}

                </span>

              )}

            </button>

          </div>

          <div className="mudlay-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">

            {CATEGORIES.map((item) => (

              <button

                type="button"

                key={item}

                onClick={() => {

                  setCategory(item);

                  setView("shop");

                }}

                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[11px] font-bold transition sm:text-xs ${

                  category === item

                    ? "border-[#283d2d] bg-[#283d2d] text-white"

                    : "border-black/[.07] bg-white text-[#5e6258] hover:border-[#82936d]"

                }`}

              >

                {category === item && <LuCheck size={12} />}

                {item}

              </button>

            ))}

          </div>

          {(query || activeFilters > 0 || view === "favorites") && (

            <div className="mt-4 flex flex-wrap items-center gap-2">

              {query && (

                <button

                  type="button"

                  onClick={() => setQuery("")}

                  className="inline-flex items-center gap-2 rounded-full bg-[#e9ecdf] px-3 py-2 text-[10px] font-semibold"

                >

                  Search: {query} <LuX size={12} />

                </button>

              )}

              {category !== "All" && (

                <button

                  type="button"

                  onClick={() => setCategory("All")}

                  className="inline-flex items-center gap-2 rounded-full bg-[#e9ecdf] px-3 py-2 text-[10px] font-semibold"

                >

                  {category} <LuX size={12} />

                </button>

              )}

              {(minPrice !== "" || maxPrice !== "") && (

                <button

                  type="button"

                  onClick={() => {

                    setMinPrice("");

                    setMaxPrice("");

                  }}

                  className="inline-flex items-center gap-2 rounded-full bg-[#e9ecdf] px-3 py-2 text-[10px] font-semibold"

                >

                  Price range <LuX size={12} />

                </button>

              )}

              {inStockOnly && (

                <button

                  type="button"

                  onClick={() => setInStockOnly(false)}

                  className="inline-flex items-center gap-2 rounded-full bg-[#e9ecdf] px-3 py-2 text-[10px] font-semibold"

                >

                  In stock <LuX size={12} />

                </button>

              )}

              {view === "favorites" && (

                <button

                  type="button"

                  onClick={() => setView("shop")}

                  className="rounded-full bg-[#e9ecdf] px-3 py-2 text-[10px] font-semibold"

                >

                  Exit wishlist

                </button>

              )}

              <button

                type="button"

                onClick={() => {

                  resetFilters();

                  setView("shop");

                }}

                className="inline-flex items-center gap-1.5 px-2 py-2 text-[10px] font-bold text-[#526347] underline underline-offset-4"

              >

                <LuRotateCcw size={12} /> Clear filters

              </button>

            </div>

          )}

          {loading ? (

            <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

              {Array.from({ length: 10 }).map((_, index) => (

                <SkeletonCard key={index} />

              ))}

            </div>

          ) : filtered.length ? (

            <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

              {filtered.map((product, index) => (

                <div

                  key={product._id}

                  data-aos="fade-up"

                  data-aos-delay={(index % 5) * 35}

                  className="mudlay-product-shell min-w-0"

                >

                  <ProductCard

                    product={product}

                    onAdd={add}

                    quantity={

                      cart.find(

                        (item) =>

                          String(item.product._id) === String(product._id) &&
                          !item.product.selectedSize &&
                          !item.product.selectedColor

                      )?.qty || 0

                    }

                    onFavorite={toggleFavorite}

                    favorite={favorites.some(

                      (id) => String(id) === String(product._id)

                    )}

                    onChangeQty={changeQty}
                    onViewProduct={openProduct}

                  />
                  <button
                    type="button"
                    aria-label={`Share ${product.name || "product"}`}
                    title="Share product"
                    onClick={() => shareProduct(product)}
                    className="absolute left-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-black/[.06] bg-white/95 text-[#283d2d] shadow-sm backdrop-blur transition hover:scale-105 hover:bg-[#dce6c5] active:scale-95 sm:left-3.5 sm:top-3.5 sm:h-10 sm:w-10"
                  >
                    <LuShare2 size={17} />
                  </button>
                </div>

              ))}

            </div>

          ) : (

            <div className="mt-8 rounded-[2rem] border border-black/[.05] bg-white px-5 py-16 text-center">

              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eceee3] text-[#526b43]">

                {apiError ? <LuShoppingBag size={24} /> : <LuSearch size={24} />}

              </div>

              <h3 className="mt-5 text-xl font-black">

                {apiError

                  ? "Collection unavailable"

                  : view === "favorites"

                    ? "Your wishlist is waiting"

                    : "Nothing found just yet"}

              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#85877b]">

                {apiError ||

                  (view === "favorites"

                    ? "Tap the heart on a product to save it here."

                    : "Try another search or remove some filters.")}

              </p>

              <div className="mt-5 flex justify-center gap-3">

                <button

                  type="button"

                  onClick={() => {

                    resetFilters();

                    setView("shop");

                  }}

                  className="rounded-full border border-black/10 px-5 py-3 text-xs font-bold"

                >

                  Reset filters

                </button>

                {apiError && (

                  <button

                    type="button"

                    onClick={() => window.location.reload()}

                    className="rounded-full bg-[#283d2d] px-5 py-3 text-xs font-bold text-white"

                  >

                    Try again

                  </button>

                )}

              </div>

            </div>

          )}

        </section>

        {/* Brand story */}

        <section id="story" className="scroll-mt-24 bg-[#283d2d] text-white">

          <div className="mx-auto grid max-w-[1480px] items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 lg:gap-14 lg:px-10 lg:py-20">

            <div data-aos="fade-right" className="mudlay-shine overflow-hidden rounded-[2rem]">

              <img

                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"

                alt="Fashion and everyday style"

                loading="lazy"

                className="h-[300px] w-full object-cover sm:h-[430px]"

              />

            </div>

            <div data-aos="fade-left">

              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#dce6c5]">

                <LuSparkles size={13} /> The Mudlay feeling

              </span>

              <h2 className="mt-6 text-4xl font-black leading-tight tracking-[-.06em] sm:text-6xl">

                Less fuss.

                <br />

                <span className="font-serif font-normal italic text-[#dce6c5]">

                  More you.

                </span>

              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-white/70 sm:text-base sm:leading-8">

                Style should feel natural, not complicated. Discover

                pieces that make everyday dressing feel easier,

                more personal and a little more fun.

              </p>

              <a

                href="#shop"

                onClick={() => setView("shop")}

                className="mudlay-button mt-7 inline-flex items-center gap-3 rounded-full bg-[#dce6c5] px-6 py-4 text-xs font-bold text-[#283d2d] sm:text-sm"

              >

                Find your favourite <LuArrowRight size={16} />

              </a>

            </div>

          </div>

        </section>

        {/* Contact */}

        <section id="contact" className="mx-auto grid max-w-[1480px] gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-2 lg:px-10">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#82936d]">

              We're here to help

            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-.06em] sm:text-5xl">

              Let's make it easy.

            </h2>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#85877b]">

              Have questions about a product, size or delivery?

              Send the shop an enquiry before placing your order.

            </p>

          </div>

          <div className="grid gap-3">

            <a

              href={whatsapp ? `https://wa.me/${whatsapp}` : "#shop"}

              target={whatsapp ? "_blank" : undefined}

              rel={whatsapp ? "noreferrer" : undefined}

              className="flex items-center gap-4 rounded-2xl border border-black/[.06] bg-white p-5 transition hover:border-[#82936d]"

            >

              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eceee3] text-[#526b43]">

                <LuMessageCircle size={21} />

              </span>

              <span>

                <span className="block text-sm font-bold">WhatsApp enquiries</span>

                <span className="mt-1 block text-xs text-[#85877b]">Talk directly with the shop</span>

              </span>

              <LuArrowRight className="ml-auto" size={18} />

            </a>

            <div className="flex items-center gap-4 rounded-2xl border border-black/[.06] bg-white p-5">

              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eceee3] text-[#526b43]">

                <LuTruck size={21} />

              </span>

              <span>

                <span className="block text-sm font-bold">Delivery information</span>

                <span className="mt-1 block text-xs text-[#85877b]">Confirm charges and availability</span>

              </span>

            </div>

          </div>

        </section>

      </main>

      {/* Footer */}

      <footer className="bg-[#202d22] px-4 py-9 text-white sm:px-6 lg:px-10">

        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <img

              src="/logo.png"

              alt="Mudlay"

              onError={(event) => {

                event.currentTarget.style.display = "none";

              }}

              className="h-10 w-10 rounded-lg object-contain"

            />

            <div>

              <p className="text-xl font-black tracking-tight">

                mudlay<span className="text-[#dce6c5]">.</span>

              </p>

              <p className="mt-1 text-[9px] uppercase tracking-[.17em] text-white/50">

                Wear your everyday

              </p>

            </div>

          </div>

          <p className="text-xs text-white/50">

            © {new Date().getFullYear()} Mudlay. All rights reserved.

          </p>

          <button

            type="button"

            onClick={goAdmin}

            className="w-fit text-xs text-white/50 underline underline-offset-4 hover:text-white"

          >

            Admin

          </button>

        </div>

      </footer>

      {/* Mobile bottom navigation */}


{/* Modern Android-style bottom navigation */}
<nav
  aria-label="Mobile navigation"
  className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:hidden transition-transform duration-300 ease-out will-change-transform ${
    navHidden ? "translate-y-full" : "translate-y-0"
  }`}
>
  <div className="mx-auto grid max-w-md grid-cols-4 items-center rounded-[28px] border border-black/[0.06] bg-white/90 p-2 shadow-[0_8px_35px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
    {/* Shop */}
    <button
      type="button"
      onClick={() => {
        setView("shop");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Shop"
      aria-current={view === "shop" ? "page" : undefined}
      className={`group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] transition-all duration-300 active:scale-95 ${
        view === "shop"
          ? "bg-[#283d2d]/[0.09] text-[#283d2d]"
          : "text-[#8b8d85] hover:bg-black/[0.04]"
      }`}
    >
      <span
        className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ${
          view === "shop" ? "bg-[#dce7dc]" : ""
        }`}
      >
        <LuShoppingBag
          size={21}
          strokeWidth={view === "shop" ? 2.5 : 1.8}
        />
      </span>
      <span
        className={`text-[10px] transition-all ${
          view === "shop" ? "font-bold" : "font-medium"
        }`}
      >
        Shop
      </span>
    </button>

    {/* Wishlist */}
    <button
      type="button"
      onClick={() => {
        setView("favorites");
        setCategory("All");
        scrollTo("shop");
      }}
      aria-label="Wishlist"
      aria-current={view === "favorites" ? "page" : undefined}
      className={`group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] transition-all duration-300 active:scale-95 ${
        view === "favorites"
          ? "bg-[#283d2d]/[0.09] text-[#283d2d]"
          : "text-[#8b8d85] hover:bg-black/[0.04]"
      }`}
    >
      <span
        className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ${
          view === "favorites" ? "bg-[#dce7dc]" : ""
        }`}
      >
        <LuHeart
          size={21}
          strokeWidth={view === "favorites" ? 2.5 : 1.8}
        />
      </span>
      <span
        className={`text-[10px] transition-all ${
          view === "favorites" ? "font-bold" : "font-medium"
        }`}
      >
        Wishlist
      </span>
    </button>

    {/* Filters */}
    <button
      type="button"
      onClick={() => setFilterOpen(true)}
      aria-label="Filters"
      className="group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] text-[#8b8d85] transition-all duration-300 hover:bg-black/[0.04] active:scale-95"
    >
      <span className="grid h-8 w-14 place-items-center rounded-full transition-all duration-300 group-active:bg-[#dce7dc]">
        <LuSlidersHorizontal size={21} strokeWidth={1.8} />
      </span>
      <span className="text-[10px] font-medium">Filters</span>
    </button>

    {/* Bag */}
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={`Bag${cartCount > 0 ? `, ${cartCount} items` : ""}`}
      className={`group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[22px] transition-all duration-300 active:scale-95 ${
        cartCount > 0
          ? "text-[#283d2d]"
          : "text-[#8b8d85] hover:bg-black/[0.04]"
      }`}
    >
      <span
        className={`relative grid h-8 w-14 place-items-center rounded-full transition-all duration-300 ${
          cartCount > 0 ? "bg-[#dce7dc]" : ""
        }`}
      >
        <LuShoppingBag
          size={21}
          strokeWidth={cartCount > 0 ? 2.5 : 1.8}
        />

        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#283d2d] px-1 text-[9px] font-bold text-white shadow-sm">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </span>
      <span
        className={`text-[10px] transition-all ${
          cartCount > 0 ? "font-bold" : "font-medium"
        }`}
      >
        Bag
      </span>
    </button>
  </div>
</nav>


      {/* Filter drawer */}

      {filterOpen && (

        <div

          className="mudlay-overlay fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px]"

          onClick={() => setFilterOpen(false)}

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-label="Product filters"

            onClick={(event) => event.stopPropagation()}

            className="mudlay-drawer flex h-full w-full max-w-md flex-col bg-[#f8f7f2] shadow-2xl"

          >

            <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-5">

              <div>

                <h2 className="text-xl font-black">Filters & sort</h2>

                <p className="mt-1 text-xs text-[#85877b]">Find your perfect match</p>

              </div>

              <IconButton label="Close filters" onClick={() => setFilterOpen(false)}>

                <LuX size={20} />

              </IconButton>

            </div>

            <div className="flex-1 space-y-7 overflow-y-auto p-5">

              <div>

                <label className="mb-3 block text-sm font-bold">Category</label>

                <div className="flex flex-wrap gap-2">

                  {CATEGORIES.map((item) => (

                    <button

                      type="button"

                      key={item}

                      onClick={() => setCategory(item)}

                      className={`rounded-full border px-4 py-2.5 text-xs font-semibold ${

                        category === item

                          ? "border-[#283d2d] bg-[#283d2d] text-white"

                          : "border-black/10 bg-white text-[#62665c]"

                      }`}

                    >

                      {item}

                    </button>

                  ))}

                </div>

              </div>

              <div>

                <label htmlFor="mudlay-sort" className="mb-3 block text-sm font-bold">Sort by</label>

                <div className="relative">

                  <select

                    id="mudlay-sort"

                    value={sort}

                    onChange={(event) => setSort(event.target.value)}

                    className="h-12 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-10 text-sm outline-none focus:border-[#82936d]"

                  >

                    {SORT_OPTIONS.map((option) => (

                      <option key={option.value} value={option.value}>

                        {option.label}

                      </option>

                    ))}

                  </select>

                  <LuChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />

                </div>

              </div>

              <div>

                <label className="mb-3 block text-sm font-bold">Price range (₹)</label>

                <div className="grid grid-cols-2 gap-3">

                  <input

                    type="number"

                    min="0"

                    value={minPrice}

                    onChange={(event) => setMinPrice(event.target.value)}

                    placeholder="Minimum"

                    aria-label="Minimum price"

                    className="h-12 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#82936d]"

                  />

                  <input

                    type="number"

                    min="0"

                    value={maxPrice}

                    onChange={(event) => setMaxPrice(event.target.value)}

                    placeholder="Maximum"

                    aria-label="Maximum price"

                    className="h-12 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#82936d]"

                  />

                </div>

                {minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice) && (

                  <p className="mt-2 text-xs text-red-600">

                    Minimum price must not exceed maximum price.

                  </p>

                )}

              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/[.06] bg-white p-4">

                <span>

                  <span className="block text-sm font-bold">Only show in-stock products</span>

                  <span className="mt-1 block text-xs text-[#85877b]">Hide unavailable products</span>

                </span>

                <input

                  type="checkbox"

                  checked={inStockOnly}

                  onChange={(event) => setInStockOnly(event.target.checked)}

                  className="h-5 w-5 accent-[#283d2d]"

                />

              </label>

            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-black/[.06] bg-white p-5">

              <button

                type="button"

                onClick={resetFilters}

                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 text-sm font-bold"

              >

                <LuRotateCcw size={15} /> Reset

              </button>

              <button

                type="button"

                onClick={() => {

                  setFilterOpen(false);

                  scrollTo("shop");

                }}

                className="h-12 rounded-xl bg-[#283d2d] text-sm font-bold text-white"

              >

                Show {filtered.length} products

              </button>

            </div>

          </section>

        </div>

      )}

      {/* Cart drawer */}

      {cartOpen && (

        <div

          className="mudlay-overlay fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-[2px]"

          onClick={() => setCartOpen(false)}

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-label="Shopping bag"

            onClick={(event) => event.stopPropagation()}

            className="mudlay-drawer flex h-full w-full max-w-md flex-col bg-[#f8f7f2] shadow-2xl"

          >

            <div className="flex items-center justify-between border-b border-black/[.06] px-5 py-5">

              <div>

                <h2 className="text-xl font-black">Your bag</h2>

                <p className="mt-1 text-xs text-[#85877b]">

                  {cartCount} {cartCount === 1 ? "item" : "items"}

                </p>

              </div>

              <IconButton label="Close bag" onClick={() => setCartOpen(false)}>

                <LuX size={20} />

              </IconButton>

            </div>

            {cart.length === 0 ? (

              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">

                <span className="grid h-20 w-20 place-items-center rounded-full bg-[#eceee3] text-[#526b43]">

                  <LuShoppingBag size={30} />

                </span>

                <h3 className="mt-5 text-xl font-black">A little room for something lovely.</h3>

                <p className="mt-2 text-sm leading-6 text-[#85877b]">

                  Your bag is empty. Explore the collection to find something you love.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    setCartOpen(false);

                    scrollTo("shop");

                  }}

                  className="mudlay-button mt-5 rounded-full bg-[#283d2d] px-6 py-3 text-sm font-bold text-white"

                >

                  Explore collection

                </button>

              </div>

            ) : (

              <>

                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">

                  {cart.map(({ product, qty }) => (

                    <div

                      key={`${product._id}-${product.selectedSize || "no-size"}-${product.selectedColor || "no-color"}`}

                      className="flex gap-3 rounded-2xl border border-black/[.05] bg-white p-3"

                    >

                      <img

                        src={getProductImage(product)}

                        alt={product.name}

                        onError={(event) => {

                          event.currentTarget.style.visibility = "hidden";

                        }}

                        className="h-24 w-20 shrink-0 rounded-xl bg-[#ecebe4] object-cover"

                      />

                      <div className="flex min-w-0 flex-1 flex-col">

                        <p className="line-clamp-2 text-sm font-bold">{product.name}</p>

                        <p className="mt-1 text-xs text-[#85877b]">{product.category}</p>
                        {(product.selectedSize || product.selectedColor) && <p className="mt-1 text-[10px] font-semibold text-[#526b43]">{[product.selectedSize ? `Size: ${product.selectedSize}` : "", product.selectedColor ? `Colour: ${product.selectedColor}` : ""].filter(Boolean).join(" · ")}</p>}

                        <p className="mt-2 text-sm font-extrabold text-[#283d2d]">

                          {money(Number(product.price) * qty)}

                        </p>

                        <div className="mt-auto flex items-center justify-between pt-2">

                          <div className="flex items-center gap-3 rounded-lg bg-[#eceee3] p-1">

                            <button

                              type="button"

                              onClick={() => changeQty(product._id, -1, product.selectedSize || "", product.selectedColor || "")}

                              aria-label="Decrease quantity"

                              className="grid h-7 w-7 place-items-center rounded-md bg-white"

                            >

                              <LuMinus size={13} />

                            </button>

                            <span className="min-w-4 text-center text-xs font-bold">{qty}</span>

                            <button

                              type="button"

                              onClick={() => add(product)}

                              aria-label="Increase quantity"

                              className="grid h-7 w-7 place-items-center rounded-md bg-[#283d2d] text-white"

                            >

                              <LuPlus size={13} />

                            </button>

                          </div>

                          <button

                            type="button"

                            onClick={() => {

                              setCart((current) =>

                                current.filter(

                                  (item) =>

                                    String(item.product._id) !== String(product._id)

                                )

                              );

                              setNotice("Removed from your bag");

                            }}

                            aria-label={`Remove ${product.name}`}

                            className="grid h-8 w-8 place-items-center rounded-full text-[#999b90] transition hover:bg-red-50 hover:text-red-600"

                          >

                            <LuTrash2 size={16} />

                          </button>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

                <div className="border-t border-black/[.06] bg-white p-5">

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-[#85877b]">Estimated subtotal</span>

                    <strong className="text-lg">{money(cartTotal)}</strong>

                  </div>

                  <p className="mt-2 text-[11px] leading-5 text-[#85877b]">

                    Delivery charges and availability will be confirmed by the shop.

                  </p>

                  <button

                    type="button"

                    onClick={checkout}

                    className="mudlay-button mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#283d2d] text-sm font-bold text-white"

                  >

                    <LuMessageCircle size={17} /> Enquire on WhatsApp

                  </button>

                </div>

              </>

            )}

          </section>

        </div>

      )}

      {/* Toast */}

      {notice && (

        <div

          role="status"

          className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#283d2d] px-5 py-3 text-center text-xs font-semibold text-white shadow-xl md:bottom-6"

        >

          {notice}

        </div>

      )}

      {showTop && (

        <button

          type="button"

          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}

          aria-label="Scroll to top"

          className="fixed bottom-28 right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-[#283d2d] text-white shadow-lg transition hover:-translate-y-1 md:bottom-6 md:right-6"

        >

          <LuArrowUp size={19} />

        </button>

      )}

    </div>

  );

}
