import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import ProductDesign from "@/components/public-site/ProductDesign";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicProduct } from "@/lib/public-product";
const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getPublicProduct((await params).id);
  if (!data) return { title: "Product Details | MXSoCal", robots: { index: false } };
  const p = data.product;
  return { title: `${p.name} | MXSoCal`, description: p.description?.slice(0, 160) || `Explore the ${p.name}, specifications, daily pricing, and customer reviews.`, alternates: { canonical: `/${p.category === "bike" ? "bikes" : "products"}/${p.slug}` }, openGraph: { title: `${p.name} | MXSoCal`, description: p.tagline, images: p.images.slice(0, 1) } };
}
export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const { status, data } = await getPublicProduct(id);
  if (status === 404) notFound();
  if (data && data.product.category !== "bike") notFound();
  if (data?.product.slug && id !== data.product.slug) permanentRedirect(`/bikes/${data.product.slug}`);
  return <div className={font.className}><ProductDesign key={id} id={id} initialData={data} /></div>;
}
