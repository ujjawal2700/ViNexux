import React from "react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

export const ProductCard2 = React.forwardRef(
  (
    {
      className,
      imageUrl,
      name,
      tagline,
      price,
      currency = "₹",
      isCouponPrice = false,
      originalPrice,
      offerText,
      onCardClick,
      onAddToCart,
      isAdding = false,
      ...props
    },
    ref
  ) => {
    // Price formatter for consistent currency display
    const formatPrice = (amount) => {
      if (amount === undefined || amount === null) return "";
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      })
        .format(amount)
        .replace("₹", `${currency}`);
    };

    return (
      <motion.div
        ref={ref}
        onClick={onCardClick}
        className={cn(
          "group relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:border-primary/50 cursor-pointer",
          className
        )}
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        {...props}
      >
        {/* Product Image */}
        <div className="relative mb-4 flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/30">
          <img
            src={imageUrl || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&auto=format&fit=crop&q=80'}
            alt={name}
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
            draggable={false}
          />
        </div>

        {/* Product Details */}
        <div className="flex flex-grow flex-col items-center gap-1.5 w-full">
          <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs leading-relaxed">
            {tagline}
          </p>
        </div>

        {/* Pricing and Offers */}
        <div className="mt-4 flex flex-col items-center gap-2 w-full pt-2 border-t border-border/50">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {formatPrice(price)}
            </span>
            {isCouponPrice && (
              <span className="text-[11px] font-bold text-primary tracking-wide uppercase mt-0.5">
                Special Pricing
              </span>
            )}
          </div>
          {offerText && (
            <div className="flex items-center gap-2 rounded-full bg-secondary/80 px-3.5 py-1 text-xs text-secondary-foreground font-semibold border border-border/50 shadow-sm">
              {originalPrice && originalPrice > price && (
                <span className="text-muted-foreground line-through text-[11px]">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {offerText}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

ProductCard2.displayName = "ProductCard2";

export default ProductCard2;
