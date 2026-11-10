"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  UserRound,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ZoomIn,
  X,
  ImageIcon,
  RefreshCcw,
} from "lucide-react";
import {
  products as editorialProducts,
  money,
  variantLabel,
  type Sneaker,
  type Cart,
} from "@/data/products";
import { demoProducts } from "@/data/demo-products";
import { changeDemoCart } from "@/lib/demo-cart";
import { Dialog } from "@/components/dialog";
import type { Phase } from "@/components/sneaker-viewer";
const Viewer = dynamic(() => import("@/components/sneaker-viewer"), {
  ssr: false,
  loading: () => (
    <div className="viewer-loading" role="status">
      Preparing showroom…
    </div>
  ),
});
type Catalog = {
  products: Sneaker[];
  live: boolean;
  message: string | null;
  whatsappNumber: string | null;
  accountUrl: string | null;
};
export default function Home({ demo = false }: { demo?: boolean }) {
  const [catalog, setCatalog] = useState<Catalog>({
    products: demo ? demoProducts : editorialProducts,
    live: false,
    message: null,
    whatsappNumber: null,
    accountUrl: null,
  });
  const [loading, setLoading] = useState(true),
    [index, setIndex] = useState(0),
    [variantId, setVariantId] = useState(""),
    [phase, setPhase] = useState<Phase>("idle");
  const [search, setSearch] = useState(false),
    [query, setQuery] = useState(""),
    [cart, setCart] = useState<Cart | null>(null),
    [dialog, setDialog] = useState<
      | "cart"
      | "account"
      | "guide"
      | "whatsapp"
      | "checkout"
      | "confirmation"
      | null
    >(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reduced, setReduced] = useState(false);
  const [rotate, setRotate] = useState(0),
    [zoom, setZoom] = useState(0),
    [reset, setReset] = useState(0);
  const [modelAvailable, setModelAvailable] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    transitioning = useRef(false);
  const items = catalog.products,
    current = items[index] || items[0],
    variant = current?.variants.find((v) => v.id === variantId);
  useEffect(() => {
    const controller = new AbortController();
    const activeTimers = timers.current;
    if (!demo)
      fetch("/api/catalog", { signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((data: Catalog) => {
          setCatalog(data);
          setIndex(0);
        })
        .catch((e) => {
          if (e.name !== "AbortError")
            setCatalog((c) => ({
              ...c,
              message:
                "The collection could not load. Please refresh to try again.",
            }));
        })
        .finally(() => setLoading(false));
    if (demo) {
      setLoading(false);
      try {
        const saved = sessionStorage.getItem("sole-cult-demo-cart");
        if (saved) setCart(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem("sole-cult-demo-cart");
      }
    }
    if (!demo)
      fetch("/api/cart", { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          if (data.cart) setCart(data.cart);
        })
        .catch(() => {});
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const changed = () => setReduced(media.matches);
    media.addEventListener("change", changed);
    return () => {
      controller.abort();
      media.removeEventListener("change", changed);
      activeTimers.forEach(clearTimeout);
    };
  }, [demo]);
  const choose = useCallback(
    (i: number) => {
      if (i === index || transitioning.current || !items.length) return;
      setError("");
      setNotice("");
      setVariantId("");
      if (reduced) {
        setIndex(i);
        setZoom(0);
        return;
      }
      transitioning.current = true;
      setPhase("out");
      timers.current.push(
        setTimeout(() => {
          setIndex(i);
          setZoom(0);
          setPhase("in");
        }, 750),
      );
    },
    [index, items.length, reduced],
  );
  const completeEntry = useCallback(() => {
    if (phase === "in")
      timers.current.push(
        setTimeout(() => {
          setPhase("idle");
          transitioning.current = false;
        }, 650),
      );
  }, [phase]);
  const next = useCallback(
    (n: number) => choose((index + n + items.length) % items.length),
    [choose, index, items.length],
  );
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        dialog ||
        search ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        next(-1);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [next, dialog, search]);
  async function updateBag(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (demo) {
        const nextCart = changeDemoCart(cart, body);
        setCart(nextCart);
        sessionStorage.setItem("sole-cult-demo-cart", JSON.stringify(nextCart));
        setNotice(body.action === "add" ? "Added to your preview bag." : "");
        setDialog("cart");
        return;
      }
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Your bag could not be updated.");
      setCart(data.cart);
      setNotice(
        data.warnings?.join(" ") ||
          (body.action === "add" ? "Added to your bag." : ""),
      );
      setDialog("cart");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your bag could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function openBag() {
    setDialog("cart");
    setError("");
    setNotice("");
    if (demo) return;
    try {
      const response = await fetch("/api/cart");
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setCart(data.cart);
    } catch {
      setError(
        "Your bag could not be refreshed. Please try again before checkout.",
      );
    }
  }
  const whatsapp =
    catalog.whatsappNumber && current && variant
      ? `https://wa.me/${catalog.whatsappNumber}?text=${encodeURIComponent(`Hello SOLE CULT, I would like to order ${current.name}${current.color ? ` (${current.color})` : ""}, ${variantLabel(variant)}. Please confirm availability and the final total. Product: ${current.handle}`)}`
      : null;
  const modelEnabled =
    Boolean(current?.model) && modelAvailable && phase === "idle";
  return (
    <main className="site">
      <header className="header">
        <Link
          className="logo"
          href={demo ? "/preview" : "/"}
          aria-label="SOLE CULT home"
        >
          SOLE
          <br />
          CULT<sup>®</sup>
        </Link>
        <nav aria-label="Main navigation">
          <Link
            className="active"
            href={demo ? "/preview" : "/"}
            aria-current="page"
          >
            Shop
          </Link>
          <Link href={demo ? "/about?preview=1" : "/about"}>About</Link>
        </nav>
        <div className="utilities">
          <button
            aria-label="Search"
            aria-expanded={search}
            onClick={() => setSearch(!search)}
          >
            <Search />
          </button>
          <button aria-label="Account" onClick={() => setDialog("account")}>
            <UserRound />
          </button>
          <button
            aria-label={`Bag: ${cart?.totalQuantity || 0} items`}
            onClick={openBag}
          >
            <ShoppingBag />
            <span className="count">{cart?.totalQuantity || 0}</span>
          </button>
        </div>
      </header>
      {demo && (
        <div className="demo-banner">
          <span>DESIGN PREVIEW</span> Illustrative models · sample prices &
          sizes · no real purchases
        </div>
      )}
      {search && (
        <Dialog
          title="Search sneakers"
          onClose={() => {
            setSearch(false);
            setQuery("");
          }}
        >
          <div className="search-field">
            <Search size={20} />
            <input
              aria-label="Search sneakers"
              autoFocus
              placeholder="Search sneakers"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X size={18} />
            </button>
          </div>
          <div className="search-results">
            {items
              .filter((p) =>
                (p.name + " " + p.color)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    choose(items.indexOf(p));
                    setSearch(false);
                    setQuery("");
                  }}
                >
                  {p.name}
                  <ArrowRight size={18} />
                </button>
              ))}
            {!items.some((p) =>
              (p.name + " " + p.color)
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && <p>No sneakers found. Try another search.</p>}
          </div>
        </Dialog>
      )}
      {catalog.message && (
        <p className="store-status" role="status">
          {catalog.message}
        </p>
      )}
      {current ? (
        <>
          <section className="showroom" aria-label="Sneaker showroom">
            <div className="arch arch-left" />
            <div className="arch arch-right" />
            <div className="halo" />
            <div className="intro">
              <h1>
                FOR THE
                <br />
                OBSESSED.
              </h1>
              <p>
                A curated selection of the world&apos;s most wanted sneakers.
              </p>
              <button
                className="primary"
                onClick={() =>
                  document.getElementById("collection")?.scrollIntoView({
                    behavior: reduced ? "instant" : "smooth",
                  })
                }
              >
                EXPLORE COLLECTION <ArrowRight size={19} />
              </button>
            </div>
            <div className="stage" aria-busy={phase !== "idle" || loading}>
              <div className="shoe-shadow" />
              <Viewer
                product={current}
                phase={phase}
                reduced={reduced}
                rotate={rotate}
                zoom={zoom}
                reset={reset}
                onReady={completeEntry}
                onAvailabilityChange={setModelAvailable}
              />
              <div className="pedestal" />
              {demo && (
                <span className="model-caption">
                  Illustrative 3D sneaker · drag to explore
                </span>
              )}
            </div>
            <aside
              className="product"
              id="product-details"
              aria-label="Product details"
            >
              <span className="serial">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(items.length).padStart(2, "0")}
              </span>
              <h2 aria-live="polite">{current.name}</h2>
              {current.color && <p>{current.color}</p>}
              <strong className="price">
                {current.price
                  ? money(variant?.price || current.price)
                  : "Price on request"}
              </strong>
              {current.description && (
                <p className="description">{current.description}</p>
              )}
              <div className="sizes-head">
                <b>
                  {current.variants.some((v) => v.selectedOptions.length > 1)
                    ? "SELECT OPTIONS"
                    : "SELECT SIZE"}
                </b>
                <button
                  className="text-button"
                  onClick={() => setDialog("guide")}
                >
                  Size Guide
                </button>
              </div>
              <div className="sizes">
                {current.variants.map((v) => (
                  <button
                    className={variantId === v.id ? "selected" : ""}
                    key={v.id}
                    onClick={() => {
                      setVariantId(v.id);
                      setError("");
                    }}
                    disabled={!v.availableForSale || phase !== "idle"}
                    aria-label={`${variantLabel(v)}${v.availableForSale ? "" : " — sold out"}`}
                    aria-pressed={variantId === v.id}
                  >
                    {v.selectedOptions.length === 1
                      ? v.selectedOptions[0].value
                      : v.title}
                  </button>
                ))}
              </div>
              {!current.variants.length && (
                <p className="availability">
                  Sizes and availability are not yet confirmed.
                </p>
              )}
              <button
                className="primary add"
                disabled={
                  (!catalog.live && !demo) ||
                  !variant?.availableForSale ||
                  busy ||
                  phase !== "idle"
                }
                onClick={() =>
                  variant &&
                  updateBag({
                    action: "add",
                    variantId: variant.id,
                    quantity: 1,
                  })
                }
              >
                <ShoppingBag size={18} />
                {busy ? "UPDATING BAG…" : "ADD TO BAG"}
              </button>
              {demo ? (
                <button
                  className="whatsapp"
                  disabled={!variant || phase !== "idle"}
                  onClick={() => setDialog("whatsapp")}
                >
                  ORDER ON WHATSAPP
                </button>
              ) : whatsapp ? (
                <a
                  className="whatsapp"
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                >
                  ORDER ON WHATSAPP
                </a>
              ) : (
                <button className="whatsapp" disabled>
                  ORDER ON WHATSAPP
                </button>
              )}
              <p className="availability">
                {demo
                  ? "Preview pricing and sizes. Final product assets follow approval."
                  : !catalog.live
                    ? "Online ordering is not available yet."
                    : !variantId
                      ? "Select an available size to order."
                      : !catalog.whatsappNumber
                        ? "WhatsApp ordering is not available yet."
                        : "Availability is checked again when adding to your bag."}
              </p>
              {!dialog && (
                <div aria-live="polite">
                  {error && <p className="error">{error}</p>}
                  {notice && <p>{notice}</p>}
                </div>
              )}
            </aside>
            <div className="interaction">
              <button
                disabled={!modelEnabled}
                onClick={() => setRotate((v) => v + 1)}
              >
                <RotateCw size={18} /> Rotate
              </button>
              <button
                disabled={!modelEnabled}
                onClick={() => setZoom((v) => v + 1)}
              >
                <ZoomIn size={18} /> {zoom % 2 ? "Reset zoom" : "Zoom"}
              </button>
              <button
                disabled={!modelEnabled}
                aria-label="Reset 3D view"
                onClick={() => {
                  setZoom(0);
                  setReset((v) => v + 1);
                }}
              >
                <RefreshCcw size={18} />
              </button>
              <button
                onClick={() =>
                  document.getElementById("product-details")?.scrollIntoView({
                    behavior: reduced ? "instant" : "smooth",
                    block: "center",
                  })
                }
              >
                View Details
              </button>
            </div>
          </section>
          <section
            id="collection"
            className="collection"
            aria-label="Sneaker collection"
          >
            <button
              aria-label="Previous sneaker"
              disabled={phase !== "idle"}
              onClick={() => next(-1)}
            >
              <ArrowLeft />
            </button>
            <div className="thumbnails">
              {items.map((p, i) => (
                <button
                  key={p.id}
                  aria-label={"View " + p.name}
                  aria-pressed={i === index}
                  disabled={phase !== "idle"}
                  className={"thumb " + (i === index ? "active" : "")}
                  onClick={() => choose(i)}
                >
                  {p.image ? (
                    <img src={p.image} alt="" loading="lazy" />
                  ) : (
                    <ImageIcon aria-hidden="true" size={30} strokeWidth={1} />
                  )}
                </button>
              ))}
            </div>
            <button
              aria-label="Next sneaker"
              disabled={phase !== "idle"}
              onClick={() => next(1)}
            >
              <ArrowRight />
            </button>
          </section>
        </>
      ) : (
        <section className="empty-collection">
          <h1>FOR THE OBSESSED.</h1>
          <p>The collection is being curated. Check back soon.</p>
        </section>
      )}
      <footer>
        SOLE CULT®{" "}
        {demo && (
          <a
            href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe"
            target="_blank"
            rel="noreferrer"
          >
            3D MODEL © SHOPIFY · CC BY 4.0 ↗
          </a>
        )}
        <span>FOR THE OBSESSED.</span>
      </footer>
      {dialog && (
        <Dialog
          title={
            dialog === "cart"
              ? "Your bag"
              : dialog === "guide"
                ? "Size guide"
                : dialog === "whatsapp"
                  ? "Your WhatsApp order"
                  : dialog === "checkout"
                    ? "Checkout preview"
                    : dialog === "confirmation"
                      ? "You’re in the cult."
                      : "Your account"
          }
          onClose={() => setDialog(null)}
        >
          {dialog === "account" &&
            (demo ? (
              <>
                <p className="eyebrow">WELCOME TO SOLE CULT</p>
                <h3>Your next obsession starts here.</h3>
                <p>
                  Your account will bring your orders, saved pairs and details
                  together. This is a design preview; no sign-in is required.
                </p>
                <button className="primary" onClick={() => setDialog(null)}>
                  EXPLORE THE COLLECTION <ArrowRight size={18} />
                </button>
              </>
            ) : catalog.accountUrl ? (
              <>
                <p>
                  Sign in securely to view your orders and manage your details.
                </p>
                <a className="primary" href={catalog.accountUrl}>
                  CONTINUE TO YOUR ACCOUNT <ArrowRight size={18} />
                </a>
              </>
            ) : (
              <p>
                Customer accounts are not available yet. Please check back soon.
              </p>
            ))}
          {dialog === "whatsapp" && (
            <>
              <p className="eyebrow">ORDER MESSAGE PREVIEW</p>
              <div className="order-message">
                Hello SOLE CULT, I would like to order {current?.name},{" "}
                {variant ? variantLabel(variant) : ""}. Please confirm
                availability and the final total.
              </div>
              <p>
                Your verified WhatsApp number will connect this button to the
                store. No message is sent in this preview.
              </p>
              <button
                className="primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `Hello SOLE CULT, I would like to order ${current.name}, ${variant ? variantLabel(variant) : ""}. Please confirm availability and the final total.`,
                  );
                  setNotice("Order message copied.");
                }}
              >
                COPY ORDER MESSAGE
              </button>
              {notice && <p role="status">{notice}</p>}
            </>
          )}
          {dialog === "checkout" && (
            <>
              <p className="eyebrow">THE FINAL STEP</p>
              <p>
                A preview of your order. Live checkout will be securely handled
                by Shopify.
              </p>
              <ul className="checkout-summary">
                {cart?.lines.nodes.map((line) => (
                  <li key={line.id}>
                    <span>
                      {line.merchandise.product.title}
                      <small>
                        {line.merchandise.title} · Qty {line.quantity}
                      </small>
                    </span>
                    <b>
                      {money({
                        amount: String(
                          Number(line.merchandise.price.amount) * line.quantity,
                        ),
                        currencyCode: line.merchandise.price.currencyCode,
                      })}
                    </b>
                  </li>
                ))}
              </ul>
              <div className="cart-total">
                <b>Sample total</b>
                <strong>{cart && money(cart.cost.totalAmount)}</strong>
              </div>
              <p>
                No payment details are collected. Shipping and taxes will be
                determined by your Shopify configuration.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setCart(null);
                  sessionStorage.removeItem("sole-cult-demo-cart");
                  setDialog("confirmation");
                }}
              >
                PREVIEW ORDER CONFIRMATION <ArrowRight size={18} />
              </button>
            </>
          )}
          {dialog === "confirmation" && (
            <>
              <p className="confirmation-mark">✓</p>
              <h3>Your next obsession, secured.</h3>
              <p>
                This is a preview confirmation. No order was placed and no
                payment was taken.
              </p>
              <button className="primary" onClick={() => setDialog(null)}>
                BACK TO THE SHOWROOM
              </button>
            </>
          )}
          {dialog === "guide" && (
            <>
              <p>
                Sizes are shown exactly as supplied by the brand. Different
                brands and releases can fit differently.
              </p>
              <p>
                Check the sizing system in the selected option before ordering.
                Contact the store for measurements; do not assume EU, UK and US
                sizes are interchangeable.
              </p>
            </>
          )}
          {dialog === "cart" && (
            <>
              <div aria-live="polite">
                {error && <p className="error">{error}</p>}
                {notice && <p>{notice}</p>}
              </div>
              {!cart?.lines.nodes.length ? (
                <p>Your bag is empty. Find your next pair in the showroom.</p>
              ) : (
                <>
                  <ul className="cart-lines">
                    {cart.lines.nodes.map((line) => (
                      <li key={line.id}>
                        {line.merchandise.product.featuredImage && (
                          <img
                            src={line.merchandise.product.featuredImage.url}
                            alt=""
                          />
                        )}
                        <div>
                          <h3>{line.merchandise.product.title}</h3>
                          <p>
                            {line.merchandise.selectedOptions
                              .map((o) => `${o.name}: ${o.value}`)
                              .join(" / ")}
                          </p>
                          <p>{money(line.merchandise.price)}</p>
                          <label>
                            Quantity{" "}
                            <select
                              aria-label={`Quantity for ${line.merchandise.product.title}`}
                              value={line.quantity}
                              disabled={busy}
                              onChange={(e) =>
                                updateBag({
                                  action: "update",
                                  lineId: line.id,
                                  quantity: Number(e.target.value),
                                })
                              }
                            >
                              {Array.from(
                                { length: Math.max(10, line.quantity) },
                                (_, i) => (
                                  <option key={i + 1}>{i + 1}</option>
                                ),
                              )}
                            </select>
                          </label>
                          <button
                            className="text-button remove"
                            disabled={busy}
                            onClick={() =>
                              updateBag({ action: "remove", lineId: line.id })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="cart-total">
                    <b>Estimated total</b>
                    <strong>{money(cart.cost.totalAmount)}</strong>
                  </div>
                  <p>
                    Shipping and any applicable taxes are confirmed at checkout.
                  </p>
                  {demo ? (
                    <button
                      className="primary"
                      onClick={() => setDialog("checkout")}
                    >
                      CONTINUE TO CHECKOUT <ArrowRight size={18} />
                    </button>
                  ) : (
                    <a
                      className={`primary ${busy || error ? "disabled-link" : ""}`}
                      aria-disabled={busy || Boolean(error)}
                      href={busy || error ? undefined : cart.checkoutUrl}
                    >
                      CONTINUE TO CHECKOUT <ArrowRight size={18} />
                    </a>
                  )}
                </>
              )}
            </>
          )}
        </Dialog>
      )}
    </main>
  );
}
