import AdminProductEditor from "@/components/products/AdminProductEditor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AdminProductEditor id={(await params).id} />; }
