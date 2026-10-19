"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import CoachFilter from "@/components/public-site/CoachFilter";
import s from "./stories.module.css";

export default function StoriesToolbar({ categories, category, query }: { categories: string[]; category: string; query: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(category);
  const [text, setText] = useState(query);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const nextQuery = text.trim();
    if (selected) params.set("category", selected);
    if (nextQuery) params.set("q", nextQuery);
    router.push(`/stories${params.size ? `?${params}` : ""}`);
  }
  return <form className={s.toolbar} onSubmit={submit} role="search" aria-label="Find a story">
    <CoachFilter label="Story category" value={selected} appliedValue={category} onChange={setSelected} options={[{ value: "", label: "All Stories" }, ...categories.map(value => ({ value, label: value }))]} />
    <label className={s.query}><FiSearch aria-hidden="true" /><input type="search" name="q" aria-label="Search stories" placeholder="Search stories" value={text} maxLength={100} onChange={event => setText(event.target.value)} /></label>
    <button type="submit"><img src="/images/bikes/e437e.svg" alt="" />Search Stories</button>
  </form>;
}
