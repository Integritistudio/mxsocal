/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { customerRequest } from "@/services/customer";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { FiArrowDown, FiArrowLeft, FiArrowRight, FiArrowUpRight, FiBookmark, FiCheck, FiChevronDown, FiDownload, FiMapPin, FiPlay, FiShare2, FiStar, FiX } from "react-icons/fi";
import { PiMotorcycle } from "react-icons/pi";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { productPrice, ratingCategories, type ProductResult, type PublicProduct, type DetailPair } from "./product-types";
import ProductSkeleton from "./ProductSkeleton";
import BikeViewer, { hasBikeView } from "./BikeViewer";
import { filterReviews } from "./review-filters";
import CoachFilter from "./CoachFilter";
import shared from "./contact-design.module.css";
import listing from "./coaches-design.module.css";
import s from "./product-design.module.css";
const asset = (name: string) => `/images/product-detail/${name}`;
const overviewIcons = ["af9a3.svg", "a0091.svg", "9c915.svg", "4a7ac.svg", "06265.svg", "e62c5.svg", "9a094.svg", "b8e8d.svg", "643dc.svg", "c0f7f.svg", "fbacd.svg", "a7cb4.svg"];
const badgeIcons = ["9e1c0.svg", "205bf.svg", "3869f.svg", "9c915.svg"];
const booking = (p: PublicProduct) => `/booking?bike=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.name)}`;
function Photo({ src, alt, ...props }: { src?: string; alt: string; loading?: "lazy" | "eager" }) { const [failed, setFailed] = useState(false); return src && !failed ? <img src={src} alt={alt} onError={() => setFailed(true)} {...props} /> : <span className={s.fallback}><PiMotorcycle size={54} aria-hidden="true" />{alt}</span>; }
function Stars({ value }: { value: number }) { return <span className={s.stars} aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map(n => <img key={n} src={asset("9aebe.svg")} alt="" style={{ opacity: n <= Math.round(value) ? 1 : .25, transform: "scaleY(-1)" }} />)}</span>; }
function Pairs({ rows, icons = false }: { rows: DetailPair[]; icons?: boolean }) { return <dl className={icons ? s.overviewList : s.specList}>{rows.map((row, i) => <div key={`${row.label}-${i}`}><dt>{icons && <img src={asset(overviewIcons[i % overviewIcons.length])} alt="" />}<span>{row.label}</span></dt><dd>{row.value}</dd></div>)}</dl>; }
export default function ProductDesign({ id, initialData = null }: { id: string; initialData?: ProductResult | null }) {
  const { user, loadingAuth } = useUser();
  const router = useRouter();
  const [data, setData] = useState<ProductResult | null>(initialData);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [bikeViewOpen, setBikeViewOpen] = useState(false);
  const [openSpec, setOpenSpec] = useState<number | null>(0);
  const [reviewCount, setReviewCount] = useState(2);
  const [reviewRating, setReviewRating] = useState("");
  const [reviewSort, setReviewSort] = useState("newest");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  useEffect(() => { const urls = reviewImages.map(file => URL.createObjectURL(file)); void Promise.resolve().then(() => setImagePreviews(urls)); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [reviewImages]);
  function addImages(files: FileList | null) {
    if (!files) return;
    const selected = [...reviewImages, ...Array.from(files)];
    const message = selected.length > 5 ? "Choose at most 5 images." : selected.some(file => !["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) ? "Only JPG and PNG images are allowed." : selected.reduce((sum, file) => sum + file.size, 0) >= 5 * 1024 * 1024 ? "Images must total less than 5 MB." : "";
    setReviewErrors(previous => ({ ...previous, images: message }));
    if (!message) setReviewImages(selected);
  }
  const gallery = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const related = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (loadingAuth || (initialData && retry === 0 && !user)) return;
    const controller = new AbortController();
    void fetch(`/api/products/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(response.status === 404 ? "This product is unavailable." : "We couldn’t load this product. Please try again."); return response.json() as Promise<ProductResult>; }).then(result => { if (!controller.signal.aborted) { setData(result); setError(""); } }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Please try again."); });
    return () => controller.abort();
  }, [id, retry, initialData, user, loadingAuth]);
  useEffect(() => { const media = gsap.matchMedia(); media.add("(prefers-reduced-motion: no-preference)", () => { gsap.to(light.current, { x: 14, y: -10, duration: 16, repeat: -1, yoyo: true, ease: "sine.inOut" }); }, root); return () => media.revert(); }, []);
  useEffect(() => {
    if (galleryIndex === null && !videoOpen && !bikeViewOpen) return;
    gallery.current?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [galleryIndex, videoOpen, bikeViewOpen]);
  function closeGallery() { gallery.current?.close(); setGalleryIndex(null); setVideoOpen(false); setBikeViewOpen(false); }
  async function share() { try { if (navigator.share) await navigator.share({ title: data?.product.name, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setNotice("Link copied."); } } catch { setNotice("Use the page URL to share this product."); } }
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!user || !data?.product.id) return;
    let active = true; void customerRequest("saved").then(result => { if (active) setSaved(result.ids.includes(data.product.id)); }).catch(() => {});
    return () => { active = false; };
  }, [user, data?.product.id]);
  async function toggleSaved() {
    if (!user) { router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`); return; }
    try { const result = await customerRequest(`saved/${data?.product.id}`, saved ? "DELETE" : "PUT", {}); setSaved(result.saved); setNotice(result.saved ? "Bike saved." : "Removed from your saved bikes."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save this bike."); }
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) { router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`); return; } const form = event.currentTarget; const values = new FormData(form); const body = { authorName: user.name, email: user.email, title: String(values.get("title") || "").trim(), comment: String(values.get("comment") || "").trim(), ratings };
    const errors: Record<string, string> = {};
    if (body.authorName.length < 2 || body.authorName.length > 100) errors.authorName = "Enter your name (2–100 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) errors.email = "Enter a valid email address.";
    if (body.title.length < 3 || body.title.length > 200) errors.title = "Add a review title (3–200 characters).";
    if (body.comment.length < 10 || body.comment.length > 5000) errors.comment = "Write a comment (10–5,000 characters).";
    if (ratingCategories.some(({ key }) => !ratings[key])) errors.ratings = "Please rate all six categories.";
    if (reviewImages.length > 5 || reviewImages.reduce((sum, file) => sum + file.size, 0) >= 5 * 1024 * 1024) errors.images = "Choose at most 5 images totaling less than 5 MB.";
    setReviewErrors(errors); setSubmitMessage("");
    if (Object.keys(errors).length) { if (errors.ratings) form.querySelector<HTMLButtonElement>("fieldset button")?.focus(); else form.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus(); return; }
    setSubmitting(true);
    try { const upload = new FormData(); for (const [key, value] of Object.entries(body)) upload.append(key, key === "ratings" ? JSON.stringify(value) : String(value)); reviewImages.forEach(file => upload.append("images", file)); const response = await fetch(`/api/products/${data?.product.id}/reviews`, { method: "POST", body: upload }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setSubmitMessage(result.message); form.reset(); setRatings({}); setReviewImages([]); setReviewRating(""); setReviewSort("newest"); setPhotosOnly(false); setReviewCount(2); setRetry(value => value + 1); }
    catch (failure) { setReviewErrors({ submit: failure instanceof Error ? failure.message : "Unable to send your review. Please try again." }); }
    finally { setSubmitting(false); }
  }
  const p = data?.product;
  // Temporarily hide Explore bike; enable again when the viewer is ready.
  const exploreBikeEnabled = false;
  const bikeViewAvailable = exploreBikeEnabled && !!p && hasBikeView(p.name, p.brand);
  const photos = p?.details.gallery?.length ? p.details.gallery : p?.images || [];
  const ratingProgress = data?.reviewCount && Number.isFinite(data.rating) ? Math.max(0, Math.min(5, data.rating)) * 20 : 0;
  const visibleReviews = Array.from(new Map([...(data?.reviews || []), ...(user ? data?.myReviews || [] : [])].map(review => [review.id, review])).values());
  const filteredReviews = filterReviews(visibleReviews, reviewRating, reviewSort, photosOnly);
  return <div ref={root} className={`${shared.page} ${s.page}`}>
    <a href="#main-content" className={shared.skip}>Skip to content</a><PublicSiteHeader activePath="/bikes" />
    <main id="main-content" className={s.main}>
      <div ref={light} className={s.glow} aria-hidden="true" /><div className={s.glowBottom} aria-hidden="true" />
      {!p && !error && <ProductSkeleton />}
      {error && <div role="alert" className={s.error}><h1>{error}</h1><button onClick={() => { setError(""); setRetry(value => value + 1); }}>Try again</button><Link href="/bikes">Explore our bikes</Link></div>}
      {p && data && <>
        <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/bikes">{p.category === "bike" ? "Bikes for Rent" : "Equipment"}</Link><span>/</span><span>{p.name}</span></nav>
        <div className={s.titleRow}><div><h1>{p.name}</h1><p>{p.details.subtitle || p.tagline}</p></div><div className={s.titleActions}><div><button onClick={share}>Share<span><FiShare2 /></span></button><button aria-pressed={saved} onClick={toggleSaved}>{saved ? "Saved" : "Save"}<span>{saved ? <FiCheck /> : <FiBookmark />}</span></button></div><strong>{productPrice(p)}{p.pricePerDay !== null && <small> / day</small>}</strong></div></div>
        <p className={s.notice} role="status">{notice}</p>
        {!!p.details.badges?.length && <ul className={s.badges}>{p.details.badges.map((badge, i) => <li key={`${badge}-${i}`}><img src={asset(badgeIcons[i % badgeIcons.length])} alt="" />{badge}</li>)}</ul>}
        <div data-count={Math.min(photos.length, 5)} className={`${s.gallery} ${photos.length === 1 ? s.singlePhoto : ""}`}>
          {photos.slice(0, 5).map((image, i) => <button key={`${image}-${i}`} type="button" onClick={() => { if (i === 0 && bikeViewAvailable) setBikeViewOpen(true); else setGalleryIndex(i === 4 && photos.length > 5 ? 5 : i); }} aria-label={i === 0 && bikeViewAvailable ? `Explore ${p.name} from multiple angles` : i === 4 && photos.length > 5 ? `View ${photos.length - 5} more photos of ${p.name}` : `View ${p.name} photo ${i + 1}`}><Photo src={image} alt={`${p.name} — photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} />{i === 0 && bikeViewAvailable && <span className={s.bikeViewBadge}><PiMotorcycle /> Explore bike <span>Drag to view</span></span>}{i === 4 && photos.length > 5 && <span className={s.morePhotos} aria-hidden="true"><strong>+{photos.length - 5}</strong><small>View all photos</small></span>}</button>)}
          {!photos.length && <span className={s.fallback}><PiMotorcycle size={80} />Photos coming soon</span>}
          {p.details.videoUrl && <button className={s.videoButton} type="button" onClick={() => setVideoOpen(true)}><FiPlay />Video</button>}
        </div>
        <div className={s.bodyGrid}><div className={s.content}>
          {!!p.details.overview?.length && <section className={s.section}><h2>{p.category === "bike" ? "Bike Overview" : "Product Overview"}</h2><Pairs rows={p.details.overview} icons /></section>}
          {p.description && <section className={s.section}><h2>Description</h2><div className={s.description}>{p.description.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>{(p.details.reportUrl || p.details.brochureUrl) && <div className={s.downloads}>{p.details.reportUrl && <a href={p.details.reportUrl} target="_blank" rel="noreferrer"><FiDownload />View Inspection Report</a>}{p.details.brochureUrl && <a href={p.details.brochureUrl} target="_blank" rel="noreferrer"><FiDownload />Product Brochure</a>}</div>}</section>}
          {!!p.details.specifications?.length && <section className={s.section}><h2>Specifications</h2><div className={s.accordion}>{p.details.specifications.map((group, i) => <div key={`${group.title}-${i}`}><h3><button id={`spec-title-${i}`} aria-expanded={openSpec === i} aria-controls={`spec-${i}`} onClick={() => setOpenSpec(openSpec === i ? null : i)}>{group.title}<FiChevronDown className={openSpec === i ? s.rotate : ""} /></button></h3><AnimatePresence initial={false}>{openSpec === i && <motion.div id={`spec-${i}`} role="region" aria-labelledby={`spec-title-${i}`} initial={{ height: reduceMotion ? "auto" : 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: reduceMotion ? "auto" : 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .35, ease: [.22, 1, .36, 1] }} className={s.answer}><Pairs rows={group.rows} /></motion.div>}</AnimatePresence></div>)}</div></section>}
          {(p.details.address || p.location) && <section className={`${s.section} ${s.location}`}><h2>Location</h2><p>{p.details.address || p.location}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.details.address || p.location || "")}`} target="_blank" rel="noreferrer">Get Directions<FiArrowUpRight /></a>{p.details.mapEmbedUrl && <iframe src={p.details.mapEmbedUrl} title={`${p.name} rental location`} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}</section>}
          <section className={s.section}><h2>Customer Reviews</h2><div className={s.ratingSummary}><div className={s.ratingCircle}><svg className={s.ratingRing} viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle className={s.ratingTrack} cx="50" cy="50" r="48" /><circle className={s.ratingFill} cx="50" cy="50" r="48" pathLength="100" strokeDasharray={`${ratingProgress} 100`} /></svg><span>Overall Rating</span><strong>{data.reviewCount ? data.rating.toFixed(1) : "—"}</strong><span>{data.reviewCount ? "Out of 5" : "No reviews yet"}</span></div><dl className={s.ratingCategories}>{ratingCategories.map(({ key, label }) => <div key={key}><dt>{label}<small>{data.averages[key] >= 4 ? "Excellent" : data.averages[key] ? "Customer rating" : "Not rated"}</small></dt><dd><FiStar fill="currentColor" />{data.averages[key]?.toFixed(1) || "—"}</dd></div>)}</dl></div>
            {visibleReviews.length > 0 && <><div className={`${listing.filters} ${s.reviewFilters}`} role="group" aria-label="Review filters"><CoachFilter label="Filter reviews by rating" value={reviewRating} appliedValue={reviewRating} onChange={value => { setReviewRating(value); setReviewCount(2); }} options={[{ value: "", label: "All ratings" }, { value: "5", label: "5 stars" }, { value: "4", label: "4 stars & up" }, { value: "3", label: "3 stars & up" }, { value: "2", label: "2 stars & up" }, { value: "1", label: "1 star & up" }]} /><CoachFilter label="Sort reviews" value={reviewSort} appliedValue={reviewSort === "newest" ? "" : reviewSort} onChange={value => { setReviewSort(value); setReviewCount(2); }} options={[{ value: "newest", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "highest", label: "Highest rated" }, { value: "lowest", label: "Lowest rated" }]} /><CoachFilter label="Filter reviews by photos" value={photosOnly ? "photos" : ""} appliedValue={photosOnly ? "photos" : ""} onChange={value => { setPhotosOnly(value === "photos"); setReviewCount(2); }} options={[{ value: "", label: "All reviews" }, { value: "photos", label: "With photos" }]} /></div><p className={s.reviewResultCount} role="status">Showing {Math.min(reviewCount, filteredReviews.length)} of {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"}</p>{!filteredReviews.length && <div className={s.emptyReviews}><p>No reviews match these filters.</p><button className={s.outlineButton} onClick={() => { setReviewRating(""); setPhotosOnly(false); setReviewCount(2); }}>Clear filters</button></div>}</>}
            {!visibleReviews.length && <p>Be the first to share your experience.</p>}
            {filteredReviews.slice(0, reviewCount).map(review => <article className={s.review} key={review.id}><div className={s.reviewAuthor}><span>{review.authorName.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><strong>{review.authorName}</strong><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}</time></div><div className={s.reviewTitle}><Stars value={review.rating} /><h3>{review.title}</h3></div><p>{review.comment}</p>{review.images.length > 0 && <div className={s.reviewImages}>{review.images.map((src, i) => <a href={src} target="_blank" rel="noreferrer" key={`${src}-${i}`} aria-label={`Open ${review.authorName}'s review photo ${i + 1}`}><Photo src={src} alt={`Review photo ${i + 1}`} loading="lazy" /></a>)}</div>}</article>)}
            {reviewCount < filteredReviews.length && <button className={s.outlineButton} onClick={() => setReviewCount(filteredReviews.length)}>View More Reviews<FiArrowDown /></button>}
          </section>

          <section className={`${s.section} ${s.reply}`}><h2>Leave a Reply</h2><p>Your email address will not be published. Required fields are marked *</p><>{!user ? <p><Link className={s.outlineButton} href={`/sign-in?next=${encodeURIComponent(`/bikes/${id}`)}`}>Sign in to write a review</Link></p> : <form onSubmit={submitReview} noValidate><fieldset className={s.ratingInputs} aria-describedby={reviewErrors.ratings ? "rating-error" : undefined}><legend className={s.srOnly}>Rate your experience in each category</legend>{ratingCategories.map(({ key, label }) => <div key={key}><span id={`rating-${key}`}>{label}</span><div role="group" aria-labelledby={`rating-${key}`}>{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={`${n} ${n === 1 ? "star" : "stars"} for ${label}`} aria-pressed={ratings[key] === n} onClick={() => setRatings(previous => ({ ...previous, [key]: n }))}><FiStar fill={n <= (ratings[key] || 0) ? "currentColor" : "none"} /></button>)}</div></div>)}</fieldset>{reviewErrors.ratings && <p id="rating-error" className={s.fieldError}>{reviewErrors.ratings}</p>}<div className={s.formGrid}>{[{ name: "authorName", label: "Name", type: "text", max: 100 }, { name: "email", label: "Email", type: "email", max: 254 }, { name: "title", label: "Title", type: "text", max: 200 }].map(field => <div className={field.name === "title" ? s.fullWidth : ""} key={field.name}><label htmlFor={`review-${field.name}`} className={s.srOnly}>{field.label} *</label><input id={`review-${field.name}`} name={field.name} type={field.type} value={field.name === "authorName" ? user?.name : field.name === "email" ? user?.email : undefined} readOnly={field.name !== "title"} placeholder={`${field.label} *`} maxLength={field.max} autoComplete={field.name === "authorName" ? "name" : field.name === "email" ? "email" : "off"} required aria-invalid={!!reviewErrors[field.name]} aria-describedby={reviewErrors[field.name] ? `error-${field.name}` : undefined} />{reviewErrors[field.name] && <p id={`error-${field.name}`} className={s.fieldError}>{reviewErrors[field.name]}</p>}</div>)}<div className={s.fullWidth}><label htmlFor="review-comment" className={s.srOnly}>Comment *</label><textarea id="review-comment" name="comment" placeholder="Comment *" required maxLength={5000} aria-invalid={!!reviewErrors.comment} aria-describedby={reviewErrors.comment ? "error-comment" : undefined} />{reviewErrors.comment && <p id="error-comment" className={s.fieldError}>{reviewErrors.comment}</p>}</div><div className={`${s.fullWidth} ${s.uploadArea}`}><label htmlFor="review-images">Add photos <span>(optional)</span></label><p id="review-images-help">Up to 5 JPG or PNG images, less than 5 MB combined.</p><input id="review-images" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple disabled={submitting} aria-describedby="review-images-help review-images-error" onChange={event => { addImages(event.target.files); event.target.value = ""; }} /><div className={s.uploadPreviews}>{reviewImages.map((file, index) => <div key={`${file.name}-${index}`}>{imagePreviews[index] && <img src={imagePreviews[index]} alt={`Selected photo ${index + 1}`} />}<span>{file.name}</span><button type="button" disabled={submitting} aria-label={`Remove ${file.name}`} onClick={() => { setReviewImages(previous => previous.filter((_, i) => i !== index)); setReviewErrors(previous => ({ ...previous, images: "" })); }}><FiX /></button></div>)}</div><p id="review-images-error" className={s.fieldError} role="alert">{reviewErrors.images}</p></div></div>{reviewErrors.submit && <p className={s.fieldError} role="alert">{reviewErrors.submit}</p>}{submitMessage && <p role="status" className={s.success}>{submitMessage}</p>}<button className={s.primaryButton} type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Post Comment"}<FiArrowUpRight /></button></form>}</></section>
        </div><aside className={s.booking}><Link className={s.primaryButton} href={booking(p)}>Book Now<FiArrowUpRight /></Link><Link className={s.outlineButton} href={`${booking(p)}&availability=1`}>Check Availability<FiMapPin /></Link><p>Need help choosing your ride?<br />Our team is here to help.</p></aside></div>
        {data.related.length > 0 && <section className={s.related}><h2>Related Listings</h2><div className={s.relatedTrack} ref={related}>{data.related.map(item => <article className={s.relatedCard} key={item.id}><Link className={s.relatedPhoto} href={booking(item)} aria-label={`Book ${item.name}`}><Photo src={item.images[0]} alt={item.name} loading="lazy" /><span><span>Book Now<FiArrowUpRight /></span></span></Link><div><h3><Link href={`/${item.category === "bike" ? "bikes" : "products"}/${item.slug || item.id}`}>{item.name}</Link></h3><p>{item.tagline}</p><ul>{item.features.map((feature, i) => <li key={i}>{feature}</li>)}</ul><div className={s.relatedPrice}><span>{productPrice(item)}<small>{item.pricePerDay !== null ? "/ day" : ""}</small></span><Link href={`/${item.category === "bike" ? "bikes" : "products"}/${item.slug || item.id}`}>View Details</Link></div></div></article>)}</div><div className={s.relatedControls}><div><button aria-label="Previous related products" onClick={() => related.current?.scrollBy({ left: -(related.current.clientWidth + 28), behavior: reduceMotion ? "instant" : "smooth" })}><FiArrowLeft /></button><button aria-label="Next related products" onClick={() => related.current?.scrollBy({ left: related.current.clientWidth + 28, behavior: reduceMotion ? "instant" : "smooth" })}><FiArrowRight /></button></div><Link href="/bikes">View All<FiArrowUpRight /></Link></div></section>}
      </>}
    </main><PublicSiteFooter />
    <dialog ref={gallery} className={s.lightbox} aria-label={bikeViewOpen ? "Interactive bike view" : videoOpen ? "Product video" : "Product photos"} onClose={() => { setGalleryIndex(null); setVideoOpen(false); setBikeViewOpen(false); }} onClick={event => { if (event.target === event.currentTarget) closeGallery(); }}><button autoFocus className={s.close} onClick={closeGallery} aria-label="Close gallery"><FiX /></button>{p && (bikeViewOpen ? <><BikeViewer name={p.name} /><button type="button" className={s.photoMode} onClick={() => { setBikeViewOpen(false); setGalleryIndex(0); }}>View listing photos</button></> : videoOpen ? <video src={p.details.videoUrl} controls autoPlay playsInline /> : galleryIndex !== null && <><Photo key={photos[galleryIndex]} src={photos[galleryIndex]} alt={`${p.name} — photo ${galleryIndex + 1}`} /><div className={s.galleryControls}><button aria-label="Previous photo" onClick={() => setGalleryIndex((galleryIndex - 1 + photos.length) % photos.length)}><FiArrowLeft /></button><span>{galleryIndex + 1} / {photos.length}</span><button aria-label="Next photo" onClick={() => setGalleryIndex((galleryIndex + 1) % photos.length)}><FiArrowRight /></button></div></> )}</dialog>
  </div>;
}
