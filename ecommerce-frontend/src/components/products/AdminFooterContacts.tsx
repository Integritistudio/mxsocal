"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useUser } from "@/context/UserContext";
import s from "./admin-products.module.css";
type Listing = { contacts: { id: string; email: string; createdAt: string }[]; total: number; hasMore: boolean };
export default function AdminFooterContacts() {
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
    void fetch(`/api/admin/footer-contacts/admin?${new URLSearchParams({ q: filter, page: String(page) })}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load email captures. Please try again.");
      const data: Listing = await response.json();
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    return () => controller.abort();
  }, [user?.role, filter, page, key]);
  if (user?.role !== "admin") return <p>Admin access is required to view email captures.</p>;
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setFilter(query.trim()); setPage(1); setRevision(value => value + 1); }
  const data = ready ? state.data : undefined;
  return <div className={s.panel}>
    <div className={s.header}><div><h1>Email captures</h1><p>Email addresses submitted through the website footer or Founder’s Access form. Repeat submissions use the same record.</p></div><button type="button" className={s.button} onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <form className={s.actions} onSubmit={search}><input type="search" value={query} maxLength={254} aria-label="Search contacts by email" placeholder="Search email" onChange={event => setQuery(event.target.value)} /><button className={s.button} type="submit">Search</button></form>
    {!ready ? <p role="status">Loading contacts...</p> : state.error ? <p className={s.error} role="alert">{state.error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></p> : data && <>
      <p className={s.section}>{data.total} {data.total === 1 ? "contact" : "contacts"}</p>
      <div className={`${s.table} ${s.section}`}><table><thead><tr><th>Email</th><th>First submitted</th></tr></thead><tbody>{data.contacts.map(contact => <tr key={contact.id}><td>{contact.email}</td><td>{new Date(contact.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{!data.contacts.length && <p className={s.empty}>No contacts found.</p>}</div>
      <nav className={`${s.actions} ${s.section}`} aria-label="Email captures pages"><button className={s.button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button className={s.button} disabled={!data.hasMore} onClick={() => setPage(value => value + 1)}>Next</button></nav>
    </>}
  </div>;
}
