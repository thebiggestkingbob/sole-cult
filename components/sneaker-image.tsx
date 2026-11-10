import type { Sneaker } from "@/data/products";
export default function SneakerImage({
  product,
  className = "",
  decorative = false,
}: {
  product: Sneaker;
  className?: string;
  decorative?: boolean;
}) {
  if (!product.image) return null;
  const crop = product.previewCrop;
  return crop ? (
    <svg
      className={className}
      viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : product.name}
      aria-hidden={decorative || undefined}
    >
      <image href={product.image} width="1536" height="1024" />
    </svg>
  ) : (
    <img
      className={className}
      src={product.image}
      alt={decorative ? "" : product.name}
      draggable={false}
    />
  );
}
