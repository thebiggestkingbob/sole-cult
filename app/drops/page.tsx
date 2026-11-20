import Link from 'next/link';

export default function Drops() {
  return <main className="about">
    <Link href="/">← SHOP</Link>
    <div>
      <p className="eyebrow">SOLE CULT / New arrivals</p>
      <h1>The next<br />drop.</h1>
      <p>Something new is always on the horizon. Upcoming releases will appear here when dates and inventory are confirmed.</p>
      <Link className="primary" href="/">Shop the current collection</Link>
    </div>
  </main>;
}
