import AdminTrackEditor from "@/components/products/AdminTrackEditor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AdminTrackEditor id={(await params).id} />; }
