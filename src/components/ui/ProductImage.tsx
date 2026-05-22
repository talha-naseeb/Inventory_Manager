import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface ProductImageProps {
  src?: string;
  name: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ src, name, className }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  const getInitials = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (!src || error) {
    return <div className={cn("flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold select-none", className)}>{getInitials(name)}</div>;
  }

  return (
    <img
      src={src}
      alt={name}
      className={cn("object-cover", className)}
      onError={() => {
        console.warn(`Failed to load image for product: ${name}`);
        setError(true);
      }}
    />
  );
};
