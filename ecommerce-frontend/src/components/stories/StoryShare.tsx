"use client";
import { useEffect, useState } from 'react';
import { FiShare2, FiCheck } from 'react-icons/fi';
import s from './stories.module.css';
export default function StoryShare({ title }: { title: string }) {
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3000); return () => clearTimeout(timer); }, [notice]);
  async function share() { try { if (navigator.share) await navigator.share({ title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setNotice('Link copied'); } } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setNotice('Copy the page address to share this story.'); } }
  return <div className={s.share}><button type="button" onClick={share}>{notice === 'Link copied' ? <FiCheck /> : <FiShare2 />}Share Story</button>{notice && <span role="status">{notice}</span>}</div>;
}
