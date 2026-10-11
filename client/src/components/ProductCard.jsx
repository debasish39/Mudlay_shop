import { useEffect, useMemo, useState } from "react";

import {

  LuHeart,

  LuShare2,

  LuShoppingBag,

  LuPlus,

  LuMinus,

  LuImage,

  LuCheck,

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

  // Support Cloudinary URLs and legacy image formats.

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

          return String(

            item.url || item.secure_url || item.image || ""

          ).trim();

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

  useEffect(() => {

    setActiveImageIndex(0);

    setFailedImages({});

    setLoadedImages({});

  }, [product?._id, gallery.join("|")]);

  // Automatically rotate through product photos when a gallery has multiple images.

  useEffect(() => {

    if (gallery.length <= 1) return undefined;

    const intervalId = window.setInterval(() => {

      setActiveImageIndex((current) => (current + 1) % gallery.length);

    }, 3000);

    return () => window.clearInterval(intervalId);

  }, [product?._id, gallery.length, gallery.join("|")]);

  const safeIndex = gallery.length

    ? activeImageIndex % gallery.length

    : 0;

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

  function handleAdd(event) {

    event?.stopPropagation();

    if (!outOfStock) {

      onAdd?.(product);

    }

  }

  function changeImage(event, index) {

    event.stopPropagation();

    setActiveImageIndex(index);

  }

  return (

    <article className="mudlay-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#263c2c]/[0.09] bg-white">

      {/* Product image */}

      <div

        className="mudlay-card-image relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-[#f4f3ec] sm:aspect-[4/5]"

        role="button"

        tabIndex={0}

        aria-label={`View details for ${name}`}

        onClick={() => onViewProduct?.(product)}

        onKeyDown={(event) => {

          if (

            event.target === event.currentTarget &&

            (event.key === "Enter" || event.key === " ")

          ) {

            event.preventDefault();

            onViewProduct?.(product);

          }

        }}

      >

        {/* Image skeleton */}

        {!imageLoaded && !imageFailed && (

          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#efefe7] via-white to-[#e5e8df]" />

        )}

        {/* Main image */}

        {!imageFailed ? (

          <img

            key={image}

            src={image}

            alt={name}

            loading="lazy"

            decoding="async"

            onLoad={() =>

              setLoadedImages((current) => ({

                ...current,

                [image]: true,

              }))

            }

            onError={() =>

              setFailedImages((current) => ({

                ...current,

                [image]: true,

              }))

            }

            className={`relative z-[1] block h-full w-full object-cover object-center transition-opacity duration-300 ${

              imageLoaded ? "opacity-100" : "opacity-0"

            }`}

          />

        ) : (

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#96998c]">

            <LuImage size={28} strokeWidth={1.5} />

            <span className="text-[10px]">Image unavailable</span>

          </div>

        )}

        {/* Discount badge */}

        {hasDiscount && (

          <span className="absolute left-2 top-2 z-[3] rounded-md bg-[#263c2c] px-2 py-1 text-[10px] font-bold text-white shadow-sm sm:left-3 sm:top-3 sm:text-xs">

            {discount}% OFF

          </span>

        )}

        {/* Wishlist button */}

{/* Wishlist and Share buttons */}

<div className="absolute right-2 top-2 z-[4] flex flex-col gap-2 sm:right-3 sm:top-3">

  {/* Wishlist */}

  <button

    type="button"

    onClick={(event) => {

      event.stopPropagation();

      onFavorite?.(product?._id);

    }}

    aria-label={

      favorite

        ? `Remove ${name} from wishlist`

        : `Add ${name} to wishlist`

    }

    aria-pressed={favorite}

    className={`grid h-8 w-8 place-items-center rounded-full border shadow-sm backdrop-blur-md transition-transform active:scale-90 sm:h-9 sm:w-9 ${

      favorite

        ? "border-rose-100 bg-white text-rose-500"

        : "border-white/70 bg-white/90 text-[#303c31]"

    }`}

  >

    <LuHeart

      size={17}

      strokeWidth={favorite ? 2.4 : 1.8}

      fill={favorite ? "#f43f5e" : "none"}

    />

  </button>

  {/* Share */}

  <button

    type="button"

    onClick={(event) => {

      event.stopPropagation();

      const url = `${window.location.origin}/product/${encodeURIComponent(

        String(product?._id || "")

      )}`;

      const shareData = {

        title: `${name} | Mudlay`,

        text: `Check out ${name} on Mudlay!`,

        url,

      };

      if (navigator.share) {

        navigator.share(shareData).catch((error) => {

          if (error.name !== "AbortError") {

            console.error("Unable to share product:", error);

          }

        });

      } else if (navigator.clipboard?.writeText) {

        navigator.clipboard.writeText(

          `${shareData.text}\n${shareData.url}`

        ).catch((error) => {

          console.error("Unable to copy product link:", error);

        });

      } else {

        window.prompt("Copy product link:", url);

      }

    }}

    aria-label={`Share ${name}`}

    className="grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-white/90 text-[#303c31] shadow-sm backdrop-blur-md transition-transform hover:bg-white active:scale-90 sm:h-9 sm:w-9"

  >

    <LuShare2 size={16} strokeWidth={1.8} />

  </button>

</div>

        {/* Gallery indicators */}

        {gallery.length > 1 && (

          <div className="absolute inset-x-0 bottom-2 z-[4] flex items-center justify-center gap-1">

            {gallery.map((photo, index) => (

              <button

                key={`${photo}-${index}`}

                type="button"

                aria-label={`Show photo ${index + 1} of ${name}`}

                aria-pressed={safeIndex === index}

                onClick={(event) => changeImage(event, index)}

                className={`h-1.5 rounded-full border border-white/70 shadow-sm transition-all ${

                  safeIndex === index

                    ? "w-4 bg-white"

                    : "w-1.5 bg-white/60"

                }`}

              />

            ))}

          </div>

        )}

        {/* Out of stock overlay */}

        {outOfStock && (

          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-white/60 backdrop-blur-[1px]">

            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm">

              Out of stock

            </span>

          </div>

        )}

      </div>

      {/* Compact product information */}

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">

        {/* Category and cart status */}

        <div className="mb-1 flex min-w-0 items-center justify-between gap-1">

          <p className="truncate text-[9px] font-bold uppercase tracking-[0.1em] text-[#788968] sm:text-[10px]">

            {category}

          </p>

          {quantity > 0 && (

            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#edf2e9] px-1.5 py-0.5 text-[9px] font-bold text-[#426044]">

              <LuCheck size={10} />

              Added

            </span>

          )}

        </div>

        {/* Product name */}

        <h3

          title={name}

          className="line-clamp-2 min-h-[2.5em] text-[12px] font-semibold leading-[1.3] tracking-tight text-[#24291f] sm:text-sm"

        >

          <button

            type="button"

            onClick={() => onViewProduct?.(product)}

            className="text-left hover:text-[#526b43] focus-visible:underline"

          >

            {name}

          </button>

        </h3>

        {/* Short description */}

        {/* {product?.description && (

          <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-[#85887d] sm:text-[11px]">

            {product.description}

          </p>

        )} */}

        {/* Price and discount */}

        <div className="mt-0 flex min-h-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">

          <span className="text-[15px] font-extrabold tracking-tight text-[#263c2c] sm:text-base">

            {money(price)}

          </span>

          {hasDiscount && (

            <>

              <span className="text-[10px] text-[#a3a49b] line-through">

                {money(originalPrice)}

              </span>

              <span className="text-[9px] font-bold text-[#648052]">

                {discount}% off

              </span>

            </>

          )}

        </div>

        {/* Add to cart / quantity controls */}

        <div className="mt-auto pt-2.5">

          {outOfStock ? (

            <button

              type="button"

              disabled

              className="h-9 w-full cursor-not-allowed rounded-lg bg-[#f2f2ed] px-2 text-[10px] font-bold text-[#a1a397] sm:h-10"

            >

              Unavailable

            </button>

          ) : quantity > 0 ? (

            <div className="flex h-9 items-center justify-between rounded-lg border border-[#263c2c]/10 bg-[#edf2e9] p-1 sm:h-10">

              <button

                type="button"

                onClick={() => onChangeQty?.(product._id, -1)}

                aria-label={`Decrease ${name} quantity`}

                className="grid h-7 w-9 place-items-center rounded-md bg-white text-[#263c2c] shadow-sm active:bg-[#dce7d5]"

              >

                <LuMinus size={14} />

              </button>

              <span

                aria-live="polite"

                className="min-w-6 text-center text-xs font-bold tabular-nums text-[#263c2c]"

              >

                {quantity}

              </span>

              <button

                type="button"

                onClick={handleAdd}

                aria-label={`Increase ${name} quantity`}

                className="grid h-7 w-9 place-items-center rounded-md bg-[#263c2c] text-white active:bg-[#3c5740]"

              >

                <LuPlus size={15} />

              </button>

            </div>

          ) : (

            <button

              type="button"

              onClick={handleAdd}

              className="flex h-9 w-full items-center justify-between rounded-lg bg-[#263c2c] px-2.5 text-[9px] font-bold text-white transition-colors hover:bg-[#354d39] active:scale-[0.98] sm:h-10 sm:px-3 sm:text-xs"

            >

              <span className="flex items-center gap-1">

                <LuPlus size={14} strokeWidth={2.5} />

                ADD

              </span>

              <span className="flex items-center gap-1 text-white/75">

                <LuShoppingBag size={13} />

                <span className="text-[9px] font-semibold uppercase tracking-wide">

                  To bag

                </span>

              </span>

            </button>

          )}

        </div>

      </div>

      <style>{`

        .mudlay-card {

          -webkit-tap-highlight-color: transparent;

          box-shadow: 0 2px 9px rgba(36, 41, 31, 0.04);

          transition: box-shadow 180ms ease, border-color 180ms ease;

        }

        @media (hover: hover) and (pointer: fine) {

          .mudlay-card:hover {

            border-color: rgba(38, 60, 44, 0.18);

            box-shadow: 0 5px 16px rgba(36, 41, 31, 0.08);

          }

        }

        @media (prefers-reduced-motion: reduce) {

          .mudlay-card,

          .mudlay-card * {

            animation: none !important;

            transition: none !important;

          }

        }

      `}</style>

    </article>

  );

}
