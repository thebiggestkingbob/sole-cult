import About from "@/components/about";
export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  return <About preview={params.preview === "1"} />;
}
