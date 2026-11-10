import { products, type Sneaker } from "./products";
const prices = [1700, 1730, 1500, 1580, 1700, 1600, 1510];
export const demoProducts: Sneaker[] = products.map((p, i) => ({
  ...p,
  image:
    i === 0 ? "/reference/air-force.png" : "/reference/secondary-sneakers.png",
  previewCrop:
    i === 0
      ? undefined
      : {
          x: ((i - 1) % 3) * 512,
          y: i < 4 ? 120 : 625,
          width: 512,
          height: 310,
        },
  model: null,
  price: { amount: String(prices[i]), currencyCode: "ZAR" },
  description: "",
  variants: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45.5"].map(
    (size) => ({
      id: `demo-${p.id}-${size}`,
      title: size,
      availableForSale: true,
      selectedOptions: [{ name: "EU Size", value: size }],
      price: { amount: String(prices[i]), currencyCode: "ZAR" },
    }),
  ),
}));
