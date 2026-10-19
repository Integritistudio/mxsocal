/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FiArrowUpRight, FiArrowRight } from "react-icons/fi";
import type { Story, StoryListing } from "./types";
import StoriesToolbar from "./StoriesToolbar";
import s from "./stories.module.css";

const PAGE_SIZE = 6;
export const storyDate = (date: string | null) => date ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date)) : "";

export function StoryCard({ story }: { story: Story }) {
  return <article className={s.card}>
    <div className={s.cardMedia}>
      <Link className={s.cardImage} href={`/stories/${story.slug}`} aria-label={`Read ${story.title}`}>
        <img src={story.coverImage} alt={story.coverAlt} loading="lazy" width={941} height={412} />
        <span className={s.cardBadge}>{story.category}</span>
        <span className={s.imageOverlay}><span>Read more <FiArrowUpRight size={16} aria-hidden="true" /></span></span>
      </Link>
      <Link className={s.readMore} href={`/stories/${story.slug}`} tabIndex={-1} aria-hidden="true"><span>Read more</span><FiArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
    <div className={s.cardBody}>
      <p className={s.cardMeta}><span>{story.author}</span><span aria-hidden="true">•</span><time dateTime={story.publishedAt || undefined}>{storyDate(story.publishedAt)}</time></p>
      <h2><Link href={`/stories/${story.slug}`}>{story.title}</Link></h2>
    </div>
  </article>;
}

function pageItems(current: number, total: number) {
  const items: Array<number | "gap"> = [];
  for (let number = 1; number <= total; number += 1) {
    if (number === 1 || number === total || Math.abs(number - current) <= 1) items.push(number);
    else if (items[items.length - 1] !== "gap") items.push("gap");
  }
  return items;
}

export default function StoriesView({ data, query, category, page }: { data: StoryListing | null; query: string; category: string; page: number }) {
  const url = (cat: string, nextPage = 1) => { const params = new URLSearchParams(); if (cat) params.set("category", cat); if (query) params.set("q", query); if (nextPage > 1) params.set("page", String(nextPage)); return `/stories${params.size ? `?${params}` : ""}`; };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  return <main className={s.main} id="main-content">
    <h1 className={s.pageTitle}>Our Stories</h1>
    <section className={s.listSection} aria-labelledby="stories-heading">
      <h2 id="stories-heading" className={s.srOnly}>{query ? "Search results" : category || "Latest stories"}</h2>
      <StoriesToolbar categories={data?.categories || []} category={category} query={query} />
      {data && <p className={s.summary} role="status">Showing <strong>{data.stories.length}</strong> of <strong>{data.total}</strong> {query || category ? "matching stories" : "stories"}</p>}
      {!data ? <div className={s.empty}><h3>We couldn’t load the stories.</h3><p>Please try again in a moment.</p><Link href={url(category, page)}>Try Again<FiArrowRight /></Link></div> : !data.stories.length ? <div className={s.empty}><h3>{query || category ? "No stories found." : "Our next chapter is on its way."}</h3><p>{query || category ? "Try another search or browse all stories." : "Check back soon for new stories from MXSoCal."}</p>{(query || category) && <Link href="/stories">All Stories<FiArrowRight /></Link>}</div> : <div className={s.grid}>{data.stories.map(story => <StoryCard story={story} key={story.id} />)}</div>}
      {data && pages > 1 && <nav className={s.pagination} aria-label="Story pages">
        {page > 1 ? <Link className={s.pageStep} href={url(category, page - 1)}>Previous</Link> : <span className={s.pageStep} aria-disabled="true">Previous</span>}
        {pageItems(page, pages).map((item, index) => item === "gap" ? <span className={s.pageGap} key={`gap-${index}`}>…</span> : <Link key={item} href={url(category, item)} aria-current={item === page ? "page" : undefined}>{item}</Link>)}
        {page < pages ? <Link className={s.pageStep} href={url(category, page + 1)}>Next</Link> : <span className={s.pageStep} aria-disabled="true">Next</span>}
      </nav>}
    </section>
  </main>;
}
