import { products, type Sneaker } from "./products";
const prices = [1700, 1730, 1500, 1580, 1700, 1600, 1510];
const colors = [
  "#e1cfb5",
  "#b3d5e7",
  "#b6b1a8",
  "#927362",
  "#e5e5df",
  "#f5eee1",
  "#d5c1a4",
];
export const demoProducts: Sneaker[] = products.map((p, i) => ({
  ...p,
  image: `/shoes/preview-${i + 1}.png`,
  model: "/models/preview-sneaker.glb",
  previewColor: colors[i],
  price: { amount: String(prices[i]), currencyCode: "ZAR" },
  description: "",
  variants: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45.5"].map(
    (size, j) => ({
      id: `demo-${p.id}-${size}`,
      title: size,
      availableForSale: j !== 8,
      selectedOptions: [{ name: "EU Size", value: size }],
      price: { amount: String(prices[i]), currencyCode: "ZAR" },
    }),
  ),
}));
