import { AdminStoryForm } from "@/components/stories/AdminStories";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AdminStoryForm id={(await params).id} />; }
