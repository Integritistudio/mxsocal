/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { adminStories } from '@/services/stories';
import dynamic from 'next/dynamic';
const StoryEditor = dynamic(() => import('./StoryEditor'), { ssr: false, loading: () => <p role="status">Loading editor?</p> });
import StoryContent from './StoryContent';
import type { Story, StoryNode } from './types';
import s from '../products/admin-products.module.css';
import theme from './stories.module.css';
const empty: StoryNode = { type: 'doc', content: [{ type: 'paragraph' }] };
export function AdminStoryList() {
  const { user } = useUser(); const [stories, setStories] = useState<Story[]>([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [pending, setPending] = useState('');
  useEffect(() => { if (user?.role !== 'admin') return; let active = true; void adminStories().then(data => { if (active) setStories(data); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user?.role]);
  async function remove(story: Story) {
    if (!window.confirm(`Delete “${story.title}”? This cannot be undone.`)) return;
    setPending(story.id); setError('');
    try { await adminStories(story.id, 'DELETE'); setStories(previous => previous.filter(item => item.id !== story.id)); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete story.'); } finally { setPending(''); }
  }
  if (user?.role !== 'admin') return <p>Admin access is required to manage stories.</p>;
  return <div className={s.panel}><div className={s.header}><h1>Stories / Blog</h1><Link href="/dashboard/stories/new">Add Story</Link></div><p className={s.hint}>Manage articles, cover images, and search listings. Only published stories appear on the website.</p>{error && <p role="alert" className={s.error}>{error}</p>}{loading ? <p role="status">Loading stories…</p> : <div className={s.table}><table><thead><tr><th>Story</th><th>Category</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{stories.map(story => <tr key={story.id}><td><Link href={`/dashboard/stories/${story.id}`}>{story.title}</Link>{story.featured && <small style={{ display: 'block' }}>Featured</small>}</td><td>{story.category}</td><td>{story.status === 'published' ? 'Published' : 'Draft'}</td><td>{new Date(story.updatedAt).toLocaleDateString()}</td><td><div className={s.actions}><Link href={`/dashboard/stories/${story.id}`}>Edit</Link>{story.status === 'published' && <Link href={`/stories/${story.slug}`} target="_blank">View</Link>}<button className={`${s.button} ${s.danger}`} disabled={!!pending} onClick={() => remove(story)}>{pending === story.id ? 'Deleting…' : 'Delete'}</button></div></td></tr>)}</tbody></table>{!stories.length && <p className={s.empty}>No stories yet. Add your first article.</p>}</div>}</div>;
}
export function AdminStoryForm({ id }: { id: string }) {
  const { user } = useUser(); const [story, setStory] = useState<Story | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (id === 'new' || user?.role !== 'admin') return; let active = true; void adminStories(id).then(data => { if (active) setStory(data); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, [id, user?.role]);
  if (user?.role !== 'admin') return <p>Admin access is required to edit stories.</p>;
  if (error) return <p role="alert" className={s.error}>{error}</p>;
  if (id !== 'new' && !story) return <p role="status">Loading editor…</p>;
  return <StoryForm key={id} initial={story} />;
}
function StoryForm({ initial }: { initial: Story | null }) {
  const router = useRouter(); const [data, setData] = useState({ title: initial?.title || '', slug: initial?.slug || '', excerpt: initial?.excerpt || '', category: initial?.category || 'Riding Guides', author: initial?.author || 'MXSoCal Editorial', coverImage: initial?.coverImage || '', coverAlt: initial?.coverAlt || '', seoTitle: initial?.seoTitle || '', seoDescription: initial?.seoDescription || '', status: initial?.status || 'draft', featured: initial?.featured || false });
  const [content, setContent] = useState<StoryNode>(initial?.content || empty); const [manualSlug, setManualSlug] = useState(Boolean(initial)); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [preview, setPreview] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function change(key: string, value: string | boolean) { setDirty(true); setMessage(''); setData(previous => ({ ...previous, [key]: value, ...(key === 'title' && !manualSlug ? { slug: String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) } : {}) })); }
  async function upload(file?: File) {
    if (!file) return; setError(''); if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name) || file.size >= 5 * 1024 * 1024) { setError('Choose a JPG or PNG cover image under 5 MB.'); return; }
    setUploading(true); try { const body = new FormData(); body.append('images', file); const response = await fetch('/api/story-image', { method: 'POST', body }); const result = await response.json(); if (!response.ok) throw new Error(result.message); change('coverImage', result.coverImage); } catch (error) { setError(error instanceof Error ? error.message : 'Image upload failed.'); } finally { setUploading(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { const result = await adminStories(initial?.id || '', initial ? 'PATCH' : 'POST', { ...data, content }); setDirty(false); setMessage(result.status === 'published' ? 'Story published. It is now visible on Stories.' : 'Draft saved. It is only visible in the admin dashboard.'); if (!initial) router.replace(`/dashboard/stories/${result.id}`); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to save story.'); } finally { setBusy(false); }
  }
  return <div className={s.panel}><div className={s.header}><h1>{initial ? 'Edit Story' : 'New Story'}</h1><Link href="/dashboard/stories" onClick={event => { if (dirty && !window.confirm('Leave without saving your changes?')) event.preventDefault(); }}>All Stories</Link></div><form onSubmit={save}><fieldset disabled={busy || uploading}><div className={s.grid}>
    <label className={`${s.field} ${s.full}`}>Title<input required value={data.title} maxLength={160} onChange={event => change('title', event.target.value)} /></label>
    <label className={s.field}>URL slug<input required value={data.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} onChange={event => { setManualSlug(true); change('slug', event.target.value); }} /><small>/stories/{data.slug || 'your-story-title'}</small></label><label className={s.field}>Category<input required value={data.category} maxLength={60} list="story-categories" onChange={event => change('category', event.target.value)} /><datalist id="story-categories">{['Riding Guides', 'Bike Care', 'Rider Stories', 'Gear', 'News'].map(value => <option key={value}>{value}</option>)}</datalist></label>
    <label className={`${s.field} ${s.full}`}>Excerpt<textarea value={data.excerpt} maxLength={400} onChange={event => change('excerpt', event.target.value)} placeholder="A short introduction for the Stories page." /></label>
    <label className={s.field}>Author<input required value={data.author} maxLength={100} onChange={event => change('author', event.target.value)} /></label><label className={s.field}>Status<select value={data.status} onChange={event => change('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
    <label className={s.field}>Cover image<input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /><small>{uploading ? 'Uploading…' : 'JPG or PNG, under 5 MB. Landscape images work best.'}</small></label><label className={s.field}>Image description (alt text)<input value={data.coverAlt} maxLength={200} onChange={event => change('coverAlt', event.target.value)} /></label>
    <label className={`${s.field} ${s.full}`}>Cover image URL<input value={data.coverImage} maxLength={500} onChange={event => change('coverImage', event.target.value)} placeholder="Upload above or enter an image URL" /></label>{data.coverImage && <div className={s.full}><img src={data.coverImage} alt={data.coverAlt || 'Cover preview'} style={{ width: '100%', maxWidth: 500, aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10 }} /></div>}
    <label className={`${s.field} ${s.full}`} style={{ flexDirection: 'row', alignItems: 'center' }}><input type="checkbox" style={{ width: 18 }} checked={data.featured} onChange={event => change('featured', event.target.checked)} />Feature this story at the top of Stories</label>
    <div className={s.full}><h2 className="mb-3 text-lg font-semibold">Article</h2><StoryEditor value={content} onChange={value => { setContent(value); setDirty(true); setMessage(''); }} /></div>
    <div className={`${s.section} ${s.full}`}><h2>Search engine listing</h2><div className={s.grid}><label className={s.field}>SEO title (optional)<input value={data.seoTitle} maxLength={70} onChange={event => change('seoTitle', event.target.value)} /><small>Uses the article title when blank. {data.seoTitle.length}/70</small></label><label className={s.field}>SEO description (optional)<textarea value={data.seoDescription} maxLength={170} onChange={event => change('seoDescription', event.target.value)} /><small>Uses the excerpt when blank. {data.seoDescription.length}/170</small></label></div></div>
    </div></fieldset>{error && <p className={s.error} role="alert">{error}</p>}{message && <p className={s.success} role="status">{message}</p>}<div className={s.actions}><button type="submit" className={s.button} disabled={busy || uploading}>{busy ? 'Saving…' : data.status === 'published' ? 'Save & Publish' : 'Save Draft'}</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={() => setPreview(!preview)}>{preview ? 'Hide Preview' : 'Preview Article'}</button></div></form>
    {preview && <section className={theme.preview}><p className={theme.eyebrow}>{data.category}</p><h1>{data.title || 'Article title'}</h1><p className={theme.dek}>{data.excerpt}</p><StoryContent content={content} /></section>}
  </div>;
}
