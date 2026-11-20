'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Minus, Plus, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { products, zar } from '@/data/products';
import HeroScene from './hero-scene';

type BagItem = { id: string; size: string; quantity: number };
type Panel = 'search' | 'account' | 'bag';

const displayNames = products.map(product => product.name.toLowerCase().replace(/\b[a-z]/g, first => first.toUpperCase()));

export default function Home() {
  const [selection, setSelection] = useState({ index: 0, outgoing: null as number | null, pulse: 0, direction: 1 });
  const [size, setSize] = useState('');
  const [sizeMessage, setSizeMessage] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState('');
  const [bag, setBag] = useState<BagItem[]>([]);
  const [bagLoaded, setBagLoaded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const details = useRef<HTMLElement>(null);
  const { index, outgoing, pulse, direction } = selection;
  const current = products[index];
  const nextIndex = (index + 1) % products.length;

  useEffect(() => {
    try {
      const saved: BagItem[] = JSON.parse(localStorage.getItem('sole-cult-bag') || '[]');
      if (Array.isArray(saved)) {
        setBag(saved.filter(item => products.some(p => p.id === item?.id && p.sizes.includes(item.size)))
          .map(item => ({ ...item, quantity: Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1 })));
      }
    } catch {}
    setBagLoaded(true);
  }, []);

  useEffect(() => {
    if (!bagLoaded) return;
    try { localStorage.setItem('sole-cult-bag', JSON.stringify(bag)); } catch {}
  }, [bag, bagLoaded]);

  useEffect(() => {
    if (panel && !dialog.current?.open) dialog.current?.showModal();
    if (!panel && dialog.current?.open) dialog.current.close();
  }, [panel]);

  useEffect(() => {
    if (outgoing === null) return;
    const cleanup = window.setTimeout(() => setSelection(current => ({ ...current, outgoing: null })), 820);
    return () => window.clearTimeout(cleanup);
  }, [outgoing, pulse]);

  const choose = useCallback((destination: number, turn = 1, relative = false) => {
    if (!relative && destination === index) return;
    setSelection(previous => {
      const next = relative ? (previous.index + destination + products.length) % products.length : destination;
      if (previous.index === next) return previous;
      return { index: next, outgoing: previous.index, pulse: previous.pulse + 1, direction: turn };
    });
    setSize('');
    setSizeMessage('');
  }, [index]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (panel || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const turn = event.key === 'ArrowRight' ? 1 : -1;
      event.preventDefault();
      choose(turn, turn, true);
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [choose, panel]);

  const orderMessage = 'Hello SOLE CULT, I would like to order ' + current.name + ' (' + current.color + ')' + (size ? ' in size ' + size : '') + '. Please confirm availability.';
  const orderBase = 'https://wa.me/' + (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '27671453676') + '?text=';
  const bagLines = bag.map(item => ({ ...item, product: products.find(p => p.id === item.id)! }));
  const bagCount = bag.reduce((count, item) => count + item.quantity, 0);
  const bagTotal = bagLines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const bagMessage = 'Hello SOLE CULT, I would like to enquire about these items: ' + bagLines
    .map(line => `${line.product.name} (${line.product.color}), EU ${line.size} × ${line.quantity}`).join(', ') + '. Please confirm availability.';
  const searchResults = products.filter(p => (p.name + ' ' + p.color).toLowerCase().includes(query.trim().toLowerCase()));

  return <main className="site">
    <section className="campaign" aria-label="SOLE CULT sneaker showroom">
      <header className="header">
        <Link className="logo" href="/" aria-label="SOLE CULT home">SOLE CULT</Link>
        <nav aria-label="Main navigation">
          <Link href="/" aria-current="page">Shop</Link>
          <Link href="/about">About</Link>
        </nav>
        <div className="utilities">
          <button aria-label="Search" onClick={() => { setQuery(''); setPanel('search'); }}><Search /></button>
          <button aria-label="Account" onClick={() => setPanel('account')}><UserRound /></button>
          <button aria-label={`Bag: ${bagCount} items`} onClick={() => setPanel('bag')}><ShoppingBag />{bagCount > 0 && <span className="count">{bagCount}</span>}</button>
        </div>
      </header>

      <HeroScene pulse={pulse} />
      <div className="shoe-stage" data-direction={direction} data-moving={outgoing !== null}>
        <div className="ground-shadow" />
        {outgoing !== null && <img key={`out-${pulse}`} className="shoe-photo shoe-exit" src={products[outgoing].image} alt="" aria-hidden="true" />}
        <button key={`in-${pulse}`} className={`shoe-focus${pulse ? ' shoe-enter' : ''}`} aria-label={`View details for ${current.name}`} onClick={() => {
          details.current?.focus({ preventScroll: true });
          details.current?.scrollIntoView({ block: 'start' });
        }}>
          <img className="shoe-photo shoe-hover" src={current.image} alt={current.name + ' — ' + current.color} fetchPriority={pulse ? 'auto' : 'high'} />
        </button>
      </div>

      <h1 className="sr-only">SOLE CULT Shop</h1>
      <div className="campaign-controls">
        <span className="eyebrow">Next up</span>
        <button className="next-product" onClick={() => choose(1, 1, true)}>
          <span>{displayNames[nextIndex]}</span><ArrowRight size={28} strokeWidth={1.4} />
        </button>
        <div className="hero-pagination" aria-label="Sneaker navigation">
          <button className="previous" aria-label="Previous sneaker" onClick={() => choose(-1, -1, true)}><ArrowLeft size={18} strokeWidth={1.5} /></button>
          {Array.from({ length: Math.min(4, products.length) }, (_, slot) => {
            const first = Math.min(Math.max(index - 1, 0), Math.max(products.length - 4, 0));
            const product = products[first + slot];
            return <button key={product.id} className="progress" aria-label={`Show ${product.name}`} aria-current={first + slot === index ? 'true' : undefined} onClick={() => choose(first + slot, first + slot < index ? -1 : 1)} />;
          })}
        </div>
        <p className="sr-only" role="status">{current.name}, {current.color}</p>
      </div>
    </section>

    <section className="product-section" id="details" ref={details} tabIndex={-1} aria-label="Product details">
      <div className="product-copy">
        <p className="eyebrow">Product details</p>
        <h2>{current.name}</h2>
        <p>{current.color}</p>
        <p className="product-price">{zar(current.price)}</p>
        <p className="media-note">Catalogue illustration. Confirm product details and availability before ordering.</p>
      </div>
      <div className="product-order">
        <fieldset>
          <legend>Select EU size</legend>
          <div className="sizes">{current.sizes.map(option => <button key={option} aria-pressed={size === option} onClick={() => { setSize(option); setSizeMessage(''); }}>{option}</button>)}</div>
        </fieldset>
        {sizeMessage && <p role="status">{sizeMessage}</p>}
        <button className="primary" onClick={() => {
          if (!size) { setSizeMessage('Select a size first.'); return; }
          setBag(items => {
            const existing = items.find(item => item.id === current.id && item.size === size);
            return existing
              ? items.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item)
              : [...items, { id: current.id, size, quantity: 1 }];
          });
          setPanel('bag');
        }}>Add to bag</button>
        <a className="whatsapp" href={orderBase + encodeURIComponent(orderMessage)} target="_blank" rel="noreferrer">Order on WhatsApp</a>
      </div>
    </section>

    <section className="collection" aria-label="Sneaker catalogue">
      {products.map((product, i) => <button key={product.id} aria-pressed={i === index} onClick={() => choose(i, i < index ? -1 : 1)}>
        <img src={product.image} alt="" loading="lazy" />
        <span>{displayNames[i]}</span>
      </button>)}
    </section>

    <footer className="site-footer"><Link href="/drops">Drops</Link></footer>

    <dialog className="commerce-panel" ref={dialog} aria-labelledby="panel-title" onClose={() => setPanel(null)}>
      <div className="panel-header">
        <h2 id="panel-title">{panel === 'search' ? 'Search' : panel === 'account' ? 'Account' : 'Shopping bag'}</h2>
        <button aria-label="Close" onClick={() => setPanel(null)}><X /></button>
      </div>
      {panel === 'search' && <>
        <input aria-label="Search sneakers" autoFocus value={query} placeholder="Search sneakers" onChange={event => setQuery(event.target.value)} />
        <ul className="search-results">{searchResults.map(product => <li key={product.id}><button onClick={() => { choose(products.indexOf(product)); setPanel(null); }}>{product.name}<small>{product.color}</small></button></li>)}</ul>
        {!searchResults.length && <p>No sneakers found.</p>}
      </>}
      {panel === 'account' && <p>Customer accounts will be available when Shopify is connected.</p>}
      {panel === 'bag' && (bagLines.length ? <>
        <ul className="bag-items">{bagLines.map((line, i) => <li key={line.id + ':' + line.size}>
          <div>
            <span>{line.product.name} · EU {line.size}</span>
            <div className="bag-quantity">
              <button aria-label={`Decrease quantity for ${line.product.name}, size ${line.size}`} onClick={() => setBag(items => items.map((item, position) =>
                position === i ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0))}><Minus size={16} /></button>
              {line.quantity}
              <button aria-label={`Increase quantity for ${line.product.name}, size ${line.size}`} onClick={() => setBag(items => items.map((item, position) =>
                position === i ? { ...item, quantity: item.quantity + 1 } : item))}><Plus size={16} /></button>
            </div>
          </div>
          <button onClick={() => setBag(items => items.filter((_, position) => position !== i))}>Remove</button>
        </li>)}</ul>
        <p>Subtotal <strong>{zar(bagTotal)}</strong></p>
        <a className="primary" href={orderBase + encodeURIComponent(bagMessage)} target="_blank" rel="noreferrer">Enquire about bag</a>
      </> : <p>Your bag is empty.</p>)}
    </dialog>
  </main>;
}
