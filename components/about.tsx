import Link from "next/link";
export default function About({ preview = false }: { preview?: boolean }) {
  return (
    <main className="about">
      <Link href={preview ? "/preview" : "/"}>← SHOP</Link>
      <div>
        <p className="eyebrow">SOLE CULT®</p>
        <h1>
          FOR THE
          <br />
          OBSESSED.
        </h1>
        <p>
          A curated sneaker experience. Discover your next pair in our immersive
          showroom.
        </p>
        <Link className="primary" href={preview ? "/preview" : "/"}>
          EXPLORE COLLECTION →
        </Link>
      </div>
    </main>
  );
}
