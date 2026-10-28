"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useUser } from "@/context/UserContext";
import s from "./admin-products.module.css";
type Listing = { contacts: { id: string; name: string; email: string; phone: string | null; topic: string; message: string; createdAt: string }[]; total: number; hasMore: boolean };
export default function AdminContactMessages() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data?: Listing; error?: string }>({ key: "" });
  const key = `${filter}:${page}:${revision}`;
  const ready = state.key === key;
  useEffect(() => {
    if (user?.role !== "admin") return;
    const controller = new AbortController();
    void fetch(`/api/admin/contact/admin?${new URLSearchParams({ q: filter, page: String(page) })}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load contact messages. Please try again.");
      const data: Listing = await response.json();
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    return () => controller.abort();
  }, [user?.role, filter, page, key]);
  if (user?.role !== "admin") return <p>Admin access is required to view contact messages.</p>;
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilter(query.trim()); setPage(1); setRevision(value => value + 1); }
  const data = ready ? state.data : undefined;
  return <div className={s.panel}>
    <div className={s.header}><div><h1>Contact messages</h1><p>Messages submitted through the website contact form.</p></div><button type="button" className={s.button} onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <form className={s.actions} onSubmit={search}><input type="search" value={query} maxLength={254} aria-label="Search messages by name, email or topic" placeholder="Search name, email or topic" onChange={event => setQuery(event.target.value)} /><button className={s.button} type="submit">Search</button></form>
    {!ready ? <p role="status">Loading messages...</p> : state.error ? <p className={s.error} role="alert">{state.error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></p> : data && <>
      <p className={s.section}>{data.total} {data.total === 1 ? "message" : "messages"}</p>
      <div className={`${s.table} ${s.section}`}><table><thead><tr><th>Sender</th><th>Topic</th><th>Message</th><th>Received</th></tr></thead><tbody>{data.contacts.map(contact => <tr key={contact.id}>
        <td><strong>{contact.name}</strong><br /><a href={`mailto:${encodeURIComponent(contact.email)}`}>{contact.email}</a>{contact.phone && <><br /><span>{contact.phone}</span></>}</td>
        <td>{contact.topic}</td><td><details><summary>Read message</summary><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: "200px", maxWidth: "560px", marginTop: "12px" }}>{contact.message}</p></details></td>
        <td>{new Date(contact.createdAt).toLocaleString()}</td>
      </tr>)}</tbody></table>{!data.contacts.length && <p className={s.empty}>No messages found.</p>}</div>
      <nav className={`${s.actions} ${s.section}`} aria-label="Contact messages pages"><button className={s.button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button className={s.button} disabled={!data.hasMore} onClick={() => setPage(value => value + 1)}>Next</button></nav>
    </>}
  </div>;
}
