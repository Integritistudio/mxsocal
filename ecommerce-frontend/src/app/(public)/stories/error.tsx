"use client";
import s from "@/components/stories/stories.module.css";
export default function Error({ reset }: { reset: () => void }) { return <main className={s.main}><div className={s.empty}><h3>This story couldn?t load.</h3><p>Please try again in a moment.</p><button className={s.primaryLink} onClick={reset}>Try Again</button></div></main>; }
