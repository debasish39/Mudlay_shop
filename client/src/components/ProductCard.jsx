import { useEffect, useMemo, useState } from "react";
import {
  LuHeart,
  LuShoppingBag,
  LuPlus,
  LuMinus,
  LuImage,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import { imageUrl } from "../api";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function ProductCard({
  product,
  onAdd,
  quantity = 0,
  onFavorite,
  favorite = false,
  onChangeQty,
  onViewProduct,
}) {
  const name = product?.name || "Untitled product";
  const category = product?.category || "Collection";
  const price = Number(product?.price || 0);
  const stock = Number(product?.stock ?? 0);
  const outOfStock = stock <= 0;

  // Supports Cloudinary URLs, the new images[] gallery, and older image/imageUrl fields.
  const gallery = useMemo(() => {
    const candidates = [
      ...(Array.isArray(product?.images) ? product.images : []),
      product?.image,
      product?.imageUrl,
    ];

    const urls = candidates
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(item.url || item.secure_url || item.image || "").trim();
        }
        return "";
      })
      .filter(Boolean)
      .map((item) => imageUrl(item))
      .filter(Boolean);

    return [...new Set(urls)];
  }, [product?.images, product?.image, product?.imageUrl]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const [loadedImages, setLoadedImages] = useState({});

  // Reset the selected photo and image state when a different product/gallery loads.
  useEffect(() => {
    setActiveImageIndex(0);
    setFailedImages({});
    setLoadedImages({});
  }, [product?._id, gallery.join("|")]);

  const safeIndex = gallery.length ? activeImageIndex % gallery.length : 0;
  const image = gallery[safeIndex] || "";
  const imageFailed = !image || Boolean(failedImages[image]);
  const imageLoaded = Boolean(loadedImages[image]);

  const originalPrice = Number(
    product?.originalPrice ?? product?.compareAtPrice ?? 0
  );
  const hasDiscount = originalPrice > price && price >= 0;
  const discount = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  function handleAdd() {
    if (!outOfStock) onAdd?.(product);
  }

  function showPreviousImage(event) {
    event.stopPropagation();
    if (gallery.length > 1) {
      setActiveImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
    }
  }

  function showNextImage(event) {
    event.stopPropagation();
    if (gallery.length > 1) {
      setActiveImageIndex((current) => (current + 1) % gallery.length);
    }
  }

  return (
    <article className="mudlay-android-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#263c2c]/[0.07] bg-white">
      {/* Image gallery */}
      <div
        className="mudlay-android-image relative aspect-[4/5] cursor-pointer overflow-hidden bg-[#f1f1e9]"
        role="button"
        tabIndex={0}
        aria-label={`View details for ${name}`}
        onClick={() => onViewProduct?.(product)}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            onViewProduct?.(product);
          }
        }}
      >
        {!imageLoaded && !imageFailed && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#eeeee6] via-white to-[#e6e8df]" />
        )}

        {!imageFailed ? (
          <img
            key={image}
            src={image}
            alt={`${name}${gallery.length > 1 ? ` — photo ${safeIndex + 1}` : ""}`}
            loading="lazy"
            onLoad={() => setLoadedImages((current) => ({ ...current, [image]: true }))}
            onError={() => setFailedImages((current) => ({ ...current, [image]: true }))}
            className={`relative z-[1] h-full w-full object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#96998c]">
            <LuImage size={30} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Image unavailable</span>
          </div>
        )}

        {gallery.length > 1 && (
          <>
            {/* <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showPreviousImage(event); }}
              aria-label={`Previous photo of ${name}`}
              className="absolute left-2 top-1/2 z-[4] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-[#263c2c] shadow-sm transition hover:bg-white active:scale-90 sm:h-9 sm:w-9"
            >
              <LuChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); showNextImage(event); }}
              aria-label={`Next photo of ${name}`}
              className="absolute right-2 top-1/2 z-[4] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-[#263c2c] shadow-sm transition hover:bg-white active:scale-90 sm:h-9 sm:w-9"
            >
              <LuChevronRight size={18} />
            </button> */}

            <div className="absolute inset-x-0 bottom-2 z-[4] flex items-center justify-center gap-1.5">
              {gallery.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  aria-label={`Show photo ${index + 1} of ${name}`}
                  aria-pressed={safeIndex === index}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  className={`h-1.5 rounded-full border border-white/80 shadow-sm transition-all ${
                    safeIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {image && !imageFailed && (
          <div className="mudlay-android-shine pointer-events-none absolute inset-0 z-[2]" />
        )}

        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 z-[3] rounded-lg bg-[#263c2c] px-2 py-1.5 text-[9px] font-extrabold tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:text-[10px]">
            {discount}% OFF
          </span>
        )}

        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onFavorite?.(product?._id); }}
          aria-label={
            favorite
              ? `Remove ${name} from wishlist`
              : `Add ${name} to wishlist`
          }
          aria-pressed={favorite}
          className={`absolute right-2.5 top-2.5 z-[4] grid h-9 w-9 place-items-center rounded-full border shadow-sm backdrop-blur-xl transition-transform duration-200 active:scale-90 sm:right-3 sm:top-3 sm:h-10 sm:w-10 ${
            favorite
              ? "border-rose-100 bg-white text-rose-500"
              : "border-white/70 bg-white/90 text-[#303c31]"
          }`}
        >
          <LuHeart
            size={18}
            strokeWidth={favorite ? 2.4 : 1.9}
            fill={favorite ? "#f43f5e" : "none"}
          />
        </button>

        {outOfStock && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-white/65 backdrop-blur-[2px]">
            <span className="rounded-full bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-gray-600 shadow-sm sm:text-[10px]">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Compact Android shopping-app details */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-1.5">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-[#788968] sm:text-[10px]">
            {category}
          </p>
          {quantity > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf2e9] px-1.5 py-0.5 text-[9px] font-bold text-[#426044]">
              <LuCheck size={10} />
              Added
            </span>
          )}
        </div>

        <h3 title={name} className="text-[12px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#24291f] sm:text-[13px]">
          <button type="button" onClick={() => onViewProduct?.(product)} className="text-left transition hover:text-[#526b43] focus-visible:underline">
            {name}
          </button>
        </h3>

        {product?.description && (
          <p className="mt-1 line-clamp-1 text-[10px] text-[#85887d]">
            {product.description}
          </p>
        )}

        <div className="mt-2.5 flex min-h-[23px] flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-[14px] font-extrabold tracking-tight text-[#263c2c] sm:text-[16px]">
            {money(price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-[10px] text-[#a3a49b] line-through">
                {money(originalPrice)}
              </span>
              <span className="text-[9px] font-bold text-[#648052]">
                Save {money(originalPrice - price)}
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3">
          {outOfStock ? (
            <button
              type="button"
              disabled
              className="min-h-10 w-full cursor-not-allowed rounded-xl bg-[#f2f2ed] px-2 text-[10px] font-bold text-[#a1a397] sm:min-h-11 sm:text-xs"
            >
              Unavailable
            </button>
          ) : quantity > 0 ? (
            <div className="flex min-h-10 items-center justify-between rounded-xl border border-[#263c2c]/10 bg-[#edf2e9] p-1 sm:min-h-11">
              <button
                type="button"
                onClick={() => onChangeQty?.(product._id, -1)}
                aria-label={`Decrease ${name} quantity`}
                className="grid h-8 w-10 place-items-center rounded-lg bg-white text-[#263c2c] shadow-sm transition-colors active:bg-[#dce7d5] sm:h-9"
              >
                <LuMinus size={15} />
              </button>

              <span
                aria-live="polite"
                className="min-w-6 text-center text-xs font-extrabold tabular-nums text-[#263c2c]"
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleAdd}
                aria-label={`Increase ${name} quantity`}
                className="grid h-8 w-10 place-items-center rounded-lg bg-[#263c2c] text-white transition-colors active:bg-[#3c5740] sm:h-9"
              >
                <LuPlus size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="flex min-h-10 w-full items-center justify-between rounded-xl bg-[#263c2c] px-3 text-[11px] font-bold text-white transition-transform active:scale-[0.97] sm:min-h-11 sm:text-xs"
            >
              <span className="flex items-center gap-1.5">
                <LuPlus size={15} strokeWidth={2.4} />
                ADD
              </span>
              <span className="flex items-center gap-1 text-white/75">
                <LuShoppingBag size={14} />
                <span className="text-[9px] font-semibold uppercase tracking-wide">
                  To bag
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        .mudlay-android-card {
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 2px 10px rgba(36, 41, 31, .035);
          transition: box-shadow .25s ease, border-color .25s ease;
        }

        .mudlay-android-card:active {
          box-shadow: 0 1px 5px rgba(36, 41, 31, .06);
        }

        .mudlay-android-shine {
          opacity: 0;
          background: linear-gradient(
            112deg,
            transparent 25%,
            rgba(255,255,255,.04) 39%,
            rgba(255,255,255,.42) 50%,
            rgba(255,255,255,.08) 57%,
            transparent 72%
          );
          background-size: 240% 100%;
          background-position: 150% 0;
        }

        @media (hover: hover) and (pointer: fine) {
          .mudlay-android-card:hover {
            border-color: rgba(38, 60, 44, .17);
            box-shadow: 0 8px 24px rgba(36, 41, 31, .08);
          }

          .mudlay-android-card:hover .mudlay-android-shine {
            opacity: 1;
            animation: mudlay-android-shine-sweep 1s ease-out;
          }
        }

        @media (hover: none) {
          .mudlay-android-card:active .mudlay-android-shine {
            opacity: 1;
            animation: mudlay-android-shine-sweep .7s ease-out;
          }
        }

        @keyframes mudlay-android-shine-sweep {
          from { background-position: 150% 0; }
          to { background-position: -100% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mudlay-android-card,
          .mudlay-android-card *,
          .mudlay-android-shine {
            animation: none !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </article>
  );
}
