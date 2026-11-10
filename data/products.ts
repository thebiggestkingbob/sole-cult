export type Money = { amount: string; currencyCode: string };
export type Variant = {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  selectedOptions: { name: string; value: string }[];
  price: Money;
};
export type Sneaker = {
  id: string;
  handle: string;
  name: string;
  color: string;
  description: string;
  image: string | null;
  model: string | null;
  previewColor?: string;
  variants: Variant[];
  price: Money | null;
};
// Original approved assortment. These are editorial entries, never purchasable stock.
export const products: Sneaker[] = [
  ["air-force", "NIKE AIR FORCE 1 '07", "Beige Suede / White"],
  ["9060", "NEW BALANCE 9060", "Baby Blue / Cream"],
  ["p6000", "NIKE P-6000", "Metallic Silver / Brown"],
  ["dunk", "NIKE DUNK LOW", "Brown / Sail"],
  ["vomero", "NIKE AIR ZOOM VOMERO 5", "White / Silver"],
  ["samba", "ADIDAS SAMBA", "White / Black / Gum"],
  ["mule", "ADIDAS SUEDE MULE", "Beige Suede"],
].map(([id, name, color]) => ({
  id,
  handle: id,
  name,
  color,
  description: "",
  image: null,
  model: null,
  variants: [],
  price: null,
}));
export const money = (value: Money) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: value.currencyCode,
  }).format(Number(value.amount));
export const variantLabel = (variant: Variant) =>
  variant.selectedOptions
    .map((option) => `${option.name}: ${option.value}`)
    .join(" / ") || variant.title;
export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { totalAmount: Money };
  lines: {
    nodes: {
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        title: string;
        selectedOptions: { name: string; value: string }[];
        price: Money;
        product: {
          title: string;
          featuredImage: { url: string; altText: string | null } | null;
        };
      };
    }[];
  };
};
