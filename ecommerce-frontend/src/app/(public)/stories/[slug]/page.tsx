/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { getStory, siteUrl } from "@/lib/stories";
import StoryContent from "@/components/stories/StoryContent";
import StoryShare from "@/components/stories/StoryShare";
import { StoryCard, storyDate } from "@/components/stories/StoriesView";
import s from "@/components/stories/stories.module.css";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getStory((await params).slug); if (!result.data) return { title: "Story unavailable | MXSoCal", robots: { index: false } };
  const { story } = result.data; const title = story.seoTitle || `${story.title} | MXSoCal`; const description = story.seoDescription || story.excerpt; const url = `${siteUrl()}/stories/${story.slug}`; const image = new URL(story.coverImage, siteUrl()).href;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", publishedTime: story.publishedAt || undefined, modifiedTime: story.updatedAt, authors: [story.author], images: [{ url: image, alt: story.coverAlt }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}
export default async function Page({ params }: Props) {
  const { slug } = await params; const { status, data } = await getStory(slug);
  if (status === 404) notFound();
  if (!data) throw new Error("Unable to load story. Please try again.");
  const { story, related } = data;
  const jsonLd = { "@context": "https://schema.org", "@graph": [{ "@type": "BlogPosting", headline: story.title, description: story.excerpt, image: new URL(story.coverImage, siteUrl()).href, datePublished: story.publishedAt, dateModified: story.updatedAt, author: { "@type": story.author === "MXSoCal Editorial" ? "Organization" : "Person", name: story.author }, publisher: { "@type": "Organization", name: "MXSoCal", url: siteUrl() }, mainEntityOfPage: `${siteUrl()}/stories/${story.slug}`, articleSection: story.category }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Stories", item: `${siteUrl()}/stories` }, { "@type": "ListItem", position: 2, name: story.title, item: `${siteUrl()}/stories/${story.slug}` }] }] };
  return <main className={s.main} id="main-content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\u003c") }} /><nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/stories"><FiArrowLeft />Stories</Link><span>/</span><span>{story.category}</span></nav><article><header className={s.articleHeader}><p className={s.eyebrow}>{story.category}</p><h1>{story.title}</h1><p className={s.dek}>{story.excerpt}</p><div className={s.articleMeta}><div className={s.byline}><span>{story.author}</span><time dateTime={story.publishedAt || undefined}>{storyDate(story.publishedAt)}</time><span>{story.readingMinutes} min read</span></div><StoryShare title={story.title} /></div></header><figure className={s.articleCover}><img src={story.coverImage} alt={story.coverAlt} width={1440} height={810} fetchPriority="high" /></figure><div className={s.articleBody}><StoryContent content={story.content} /><footer className={s.articleFooter}><Link href="/stories"><FiArrowLeft />Back to Stories</Link><StoryShare title={story.title} /></footer></div></article>{related.length > 0 && <section className={s.related} aria-labelledby="more-stories"><h2 id="more-stories" className={s.relatedTitle}>More Stories</h2><div className={s.grid}>{related.map(item => <StoryCard story={item} key={item.id} />)}</div></section>}</main>;
}
