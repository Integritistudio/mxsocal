"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { customerRequest, type Customer } from "@/services/customer";
import s from "./admin-products.module.css";

const tabs = [{ label: "All", role: "all" }, { label: "Customers", role: "user" }, { label: "Staff", role: "manager" }, { label: "Admins", role: "admin" }];

export default function AdminUsers() {
  const { user } = useUser();
  const [users, setUsers] = useState<Customer[]>([]);
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user?.role !== "admin") return;
    let active = true;
    void customerRequest("accounts").then(data => { if (active) setUsers(data); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.role]);
  if (user?.role !== "admin") return <p>Admin access is required to view users.</p>;
  const visible = users.filter(account => tab === "all" || account.role === tab);
  return <div className={s.panel}>
    <div className={s.header}><h1>Users</h1><div className={s.actions}><Link href="/dashboard/customers">Manage Customers</Link><Link href="/managers">Manage Staff</Link></div></div>
    <div className={s.actions} role="group" aria-label="Filter users by role">{tabs.map(item => <button key={item.role} type="button" aria-pressed={tab === item.role} className={`${s.button} ${tab !== item.role ? s.secondary : ""}`} onClick={() => setTab(item.role)}>{item.label} ({users.filter(account => item.role === "all" || account.role === item.role).length})</button>)}</div>
    {error && <p role="alert" className={s.error}>{error}</p>}
    {loading ? <p role="status">Loading users…</p> : !error && <div className={`${s.table} ${s.section}`}><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th></tr></thead><tbody>{visible.map(account => <tr key={account.id}><td>{account.name}</td><td>{account.email}</td><td>{account.role === "manager" ? "Staff" : account.role === "admin" ? "Admin" : "Customer"}</td><td>{account.phone || "—"}</td><td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{!visible.length && <p className={s.empty}>No users in this category.</p>}</div>}
  </div>;
}
