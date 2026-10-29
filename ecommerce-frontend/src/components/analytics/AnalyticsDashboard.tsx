"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ApexOptions } from "apexcharts";
import { FiActivity, FiArrowDownRight, FiArrowUpRight, FiBarChart2, FiCalendar, FiDownload, FiDollarSign, FiRefreshCw, FiTable, FiTrendingUp, FiUsers, FiZap } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { getAnalytics, type AnalyticsData, type Breakdown } from "@/services/analytics";
import s from "./analytics.module.css";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false, loading: () => <div className={s.chartLoading} aria-label="Loading chart" /> });
const colors = ["#f15b50", "#8e9bff", "#b4e978", "#f6bd69", "#5bcac8", "#d990d8", "#a8b3c7", "#b77a54"];
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const shortDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const tabs = ["Overview", "Rides & demand", "Customers & engagement", "Fleet & coaching"] as const;
type ChartType = "area" | "bar" | "donut" | "radialBar" | "heatmap" | "radar" | "treemap";

function AnimatedNumber({ value, currency = false, percent = false }: { value: number; currency?: boolean; percent?: boolean }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) return;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => { const progress = Math.min(1, (now - start) / 850); setShown(value * (1 - (1 - progress) ** 3)); if (progress < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);
  const result = reduce ? value : shown;
  return <>{currency ? money(result) : percent ? `${result.toFixed(1)}%` : Math.round(result).toLocaleString()}</>;
}

function Delta({ value, previous, points = false }: { value: number; previous: number; points?: boolean }) {
  if (!previous && !value) return <span className={s.deltaNeutral}>No change</span>;
  if (!previous && !points) return <span className={s.deltaNeutral}>New this period</span>;
  const change = points ? value - previous : (value - previous) / previous * 100;
  return <span className={change >= 0 ? s.deltaUp : s.deltaDown}>{change >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}{Math.abs(change).toFixed(1)}{points ? " pp" : "%"}</span>;
}

function ChartCard({ title, subtitle, children, wide = false, badge }: { title: string; subtitle: string; children: ReactNode; wide?: boolean; badge?: string }) {
  const reduce = useReducedMotion();
  return <motion.section className={`${s.card} ${wide ? s.wide : ""}`} initial={reduce ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.4 }}><header className={s.cardHeader}><div><h3>{title}</h3><p>{subtitle}</p></div>{badge && <span className={s.tag}>{badge}</span>}</header>{children}</motion.section>;
}

function DataChart({ rows, type = "bar", monetary = false, horizontal = false, table, series, categories, height = 270 }: { rows: Breakdown; type?: ChartType; monetary?: boolean; horizontal?: boolean; table: boolean; series?: { name: string; data: number[] }[]; categories?: string[]; height?: number }) {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const labels = categories || rows.map(row => row.label);
  const allValues = series ? series.flatMap(row => row.data) : rows.map(row => row.value);
  const format = (value: number) => monetary ? money(value) : compact(value);
  if (table) return <div className={s.tableWrap}><table><thead><tr><th scope="col">{categories ? "Date" : "Category"}</th>{series ? series.map(row => <th scope="col" key={row.name}>{row.name}</th>) : <th scope="col">{monetary ? "Amount (USD)" : "Count"}</th>}</tr></thead><tbody>{labels.map((label, index) => <tr key={`${label}-${index}`}><th scope="row">{label}</th>{series ? series.map(row => <td key={row.name}>{format(row.data[index] || 0)}</td>) : <td>{format(rows[index]?.value || 0)}</td>}</tr>)}</tbody></table></div>;
  if (!allValues.some(value => value > 0) && !(type === "radialBar" && rows.length)) return <div className={s.empty}><FiBarChart2 /><strong>No activity yet</strong><span>Data will appear here when it’s recorded for this period.</span></div>;
  const isRound = type === "donut" || type === "radialBar";
  const dark = theme === "dark";
  const options: ApexOptions = {
    chart: { id, background: "transparent", fontFamily: "inherit", foreColor: dark ? "#9298a5" : "#667085", toolbar: { show: false }, animations: { enabled: !reduce, speed: 700 }, zoom: { enabled: false }, parentHeightOffset: 0 },
    colors, theme: { mode: dark ? "dark" : "light" },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: format } },
    grid: { borderColor: dark ? "#ffffff0c" : "#e9ecf1", strokeDashArray: 4, padding: { left: 4, right: 12 } },
    dataLabels: { enabled: type === "radialBar" || type === "treemap" },
    stroke: { width: type === "area" ? 2.5 : type === "radar" ? 2 : 0, curve: "smooth", colors: type === "donut" ? [dark ? "#15171c" : "#ffffff"] : undefined },
    fill: type === "area" ? { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.34, opacityTo: 0.01, stops: [0, 95] } } : { opacity: type === "radar" ? 0.2 : 1 },
    markers: { size: type === "radar" ? 3 : 0 },
    legend: { show: isRound || !!series, position: "bottom", fontSize: "12.1px", markers: { size: 5 }, itemMargin: { horizontal: 10, vertical: 5 } },
    labels: rows.map(row => row.label),
    plotOptions: { bar: { horizontal, borderRadius: 5, columnWidth: "42%", barHeight: "45%", distributed: !series }, pie: { donut: { size: "77%", labels: { show: true, name: { fontSize: "13.2px" }, value: { fontSize: "26px", fontWeight: 600, formatter: value => format(Number(value)) }, total: { show: true, label: monetary ? "Estimated USD" : "Total", color: dark ? "#9298a5" : "#667085", formatter: () => format(rows.reduce((total, row) => total + row.value, 0)) } } } }, radialBar: { hollow: { size: "72%" }, track: { background: dark ? "#ffffff0a" : "#f2f4f7" }, dataLabels: { name: { fontSize: "13.2px" }, value: { fontSize: "30px", color: dark ? "#f5f5f5" : "#101828", formatter: value => `${Number(value).toFixed(1)}%` } } } },
    xaxis: { categories: labels, axisTicks: { show: false }, axisBorder: { show: false }, labels: { style: { fontSize: "11px" }, rotate: 0, hideOverlappingLabels: true, trim: true, ...(categories ? { tickAmount: Math.min(6, labels.length - 1) } : {}) } },
    yaxis: { min: 0, labels: { style: { fontSize: "11px" }, formatter: value => horizontal ? String(value) : format(value), maxWidth: horizontal ? 155 : 75 } },
    responsive: [{ breakpoint: 600, options: { legend: { fontSize: "11px" }, plotOptions: { bar: { columnWidth: "65%" } } } }],
  };
  const values = isRound ? rows.map(row => row.value) : type === "treemap" ? [{ data: rows.map(row => ({ x: row.label, y: row.value })) }] : series || [{ name: monetary ? "USD" : "Count", data: rows.map(row => row.value) }];
  return <div className={s.chart} role="img" aria-label={series ? series.map(row => `${row.name}: ${format(row.data.reduce((a, b) => a + b, 0))} total`).join(". ") : rows.map(row => `${row.label}: ${format(row.value)}`).join(". ")}><ApexChart options={options} series={values} type={type} height={height} /></div>;
}

function DemandHeatmap({ data, table }: { data: AnalyticsData["heatmap"]; table: boolean }) {
  const { theme } = useTheme(); const reduce = useReducedMotion();
  if (table) return <div className={s.tableWrap}><table><thead><tr><th>Day</th>{data[0].data.map(row => <th key={row.x}>{row.x}</th>)}</tr></thead><tbody>{data.map(row => <tr key={row.name}><th scope="row">{row.name}</th>{row.data.map(cell => <td key={cell.x}>{cell.y}</td>)}</tr>)}</tbody></table></div>;
  return <div className={s.chart} role="img" aria-label="Ride requests by weekday and four-hour blocks, Pacific time"><ApexChart type="heatmap" height={275} series={[...data].reverse()} options={{ chart: { toolbar: { show: false }, fontFamily: "inherit", foreColor: theme === "dark" ? "#9298a5" : "#667085", background: "transparent", animations: { enabled: !reduce } }, theme: { mode: theme === "dark" ? "dark" : "light" }, colors: ["#f15b50"], dataLabels: { enabled: false }, stroke: { width: 4, colors: [theme === "dark" ? "#15171c" : "#fff"] }, plotOptions: { heatmap: { radius: 5, colorScale: { ranges: [{ from: 0, to: 0, color: theme === "dark" ? "#202329" : "#f2f4f7", name: "No requests" }] } } }, xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "11px" } } }, tooltip: { y: { formatter: value => `${value} requests` } }, legend: { show: false } }} /></div>;
}

function downloadData(data: AnalyticsData) {
  const sections: string[][] = [["MXSoCal analytics", `${data.range.start} to ${data.range.end}`], ["Time zone", data.timeZone], ["Currency", data.currency], [], ["Metric", "Current period", "Previous period"]];
  for (const key of Object.keys(data.metrics) as (keyof AnalyticsData["metrics"])[]) sections.push([key, String(data.metrics[key]), String(data.previous[key])]);
  sections.push([], ["Date", "Collected USD", "Requests", "Riders", "New customers", "Inquiries", "Email captures"]);
  data.timeline.forEach(row => sections.push([row.date, String(row.revenue), String(row.requests), String(row.riders), String(row.customers), String(row.inquiries), String(row.signups)]));
  for (const [name, value] of Object.entries(data)) if (Array.isArray(value) && value.length && "label" in value[0]) { sections.push([], [name, "Value"]); value.forEach(row => { if ("label" in row && "value" in row) sections.push([row.label, String(row.value)]); }); }
  sections.push([], ["Request weekday (Pacific)", ...data.heatmap[0].data.map(cell => cell.x)]);
  data.heatmap.forEach(row => sections.push([row.name, ...row.data.map(cell => String(cell.y))]));
  const csv = sections.map(row => row.map(cell => `"${String(cell).replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `mxsocal-analytics-${data.range.start}-${data.range.end}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export default function AnalyticsDashboard() {
  const { user, loadingAuth } = useUser(); const { theme } = useTheme(); const reduce = useReducedMotion();
  const [data, setData] = useState<AnalyticsData | null>(null); const [days, setDays] = useState(30); const [tab, setTab] = useState<typeof tabs[number]>("Overview");
  const [custom, setCustom] = useState(false); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [applied, setApplied] = useState("");
  const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [table, setTable] = useState(false);
  const query = applied || `days=${days}`;
  useEffect(() => {
    if (user?.role !== "admin") return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void getAnalytics(query, controller.signal).then(result => { setData(result); setLoading(false); }).catch(err => { if (!controller.signal.aborted) { setError(err.message || "Unable to load analytics."); setLoading(false); } });
    return () => controller.abort();
  }, [query, revision, user?.role]);
  const chartDates = useMemo(() => data?.timeline.map(row => shortDate(row.date)) || [], [data]);
  if (loadingAuth) return <div className={s.skeleton} role="status" aria-label="Loading account" />;
  if (user?.role !== "admin") return <div className={s.denied}><FiActivity /><h1>Admin access required</h1><p>Analytics is available to administrators.</p><Link href="/dashboard">Back to dashboard</Link></div>;
  const chart = (rows: Breakdown, type: ChartType = "bar", extra: Partial<Parameters<typeof DataChart>[0]> = {}) => <DataChart rows={rows} type={type} table={table} {...extra} />;
  const metricCards = data ? [
    { label: "Collected revenue", value: data.metrics.revenue, previous: data.previous.revenue, currency: true, icon: FiDollarSign, hint: `${data.metrics.payments} payments received`, spark: data.timeline.map(row => row.revenue) },
    { label: "Ride requests", value: data.metrics.requests, previous: data.previous.requests, icon: FiActivity, hint: `${data.metrics.riders} riders in these requests`, spark: data.timeline.map(row => row.requests) },
    { label: "New customers", value: data.metrics.customers, previous: data.previous.customers, icon: FiUsers, hint: "New rider accounts created", spark: data.timeline.map(row => row.customers) },
    { label: "Approval rate", value: data.metrics.approvalRate, previous: data.previous.approvalRate, percent: true, icon: FiTrendingUp, hint: "Approved groups / requests", spark: data.timeline.map(row => row.riders) },
  ] : [];
  return <div className={`${s.page} ${theme === "light" ? s.light : ""}`}>
    <header className={s.heading}><div><span className={s.eyebrow}><span /> THE MXSoCal PULSE</span><h1>Big picture.<br className={s.mobileBreak} /> Every detail.</h1><p>Your business, from first interest to the starting gate.</p></div><div className={s.actions}><button disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Refresh analytics"><FiRefreshCw className={loading ? s.spinning : ""} /></button><button className={s.export} disabled={!data || loading} onClick={() => data && downloadData(data)}><FiDownload /> Export report</button></div></header>
    <div className={s.toolbar}><div className={s.periods} aria-label="Reporting period">{[7, 30, 90, 365].map(value => <button key={value} aria-pressed={!custom && !applied && days === value} onClick={() => { setDays(value); setCustom(false); setApplied(""); }}>{value === 365 ? "1 year" : `${value} days`}</button>)}<button aria-pressed={custom || !!applied} onClick={() => setCustom(value => !value)}><FiCalendar /> Custom</button></div><span className={s.rangeLabel}>{data ? `${shortDate(data.range.start)}, ${data.range.start.slice(0, 4)} — ${shortDate(data.range.end)}, ${data.range.end.slice(0, 4)}` : "Loading reporting period…"}<small>Pacific time · USD</small></span></div>
    {custom && <form className={s.customDates} onSubmit={event => { event.preventDefault(); setApplied(new URLSearchParams({ start, end }).toString()); }}><label>From<input type="date" required value={start} max={end || data?.range.today} onChange={event => setStart(event.target.value)} /></label><label>To<input type="date" required value={end} min={start} max={data?.range.today} onChange={event => setEnd(event.target.value)} /></label><button type="submit">Apply dates</button><small>Up to 366 days. Compared with the preceding period of equal length.</small></form>}
    {error && <div role="alert" className={s.error}><span>{error}{data ? " The last successful report is shown below." : ""}</span><button onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
    {!data && loading && <div className={s.loadingGrid} role="status" aria-label="Loading analytics">{Array.from({ length: 6 }, (_, i) => <div key={i} className={s.skeleton} />)}</div>}
    {data && <div aria-busy={loading} className={loading ? s.refreshing : ""}>
      <div className={s.metrics}>{metricCards.map((card, index) => <motion.section key={card.label} className={s.metric} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : index * 0.07 }}><div className={s.metricTop}><span>{card.label}</span><card.icon /></div><div className={s.metricValue}><AnimatedNumber value={card.value} currency={card.currency} percent={card.percent} /><span className={s.metricIndex}>0{index + 1}</span></div><div className={s.metricBottom}><Delta value={card.value} previous={card.previous} points={card.percent} /><small>vs previous period</small></div><p>{card.hint}</p>{!card.percent && <div className={s.miniBars} aria-hidden="true">{card.spark.slice(-30).map((value, i) => <i key={i} style={{ height: `${Math.max(7, value / Math.max(1, ...card.spark) * 100)}%`, opacity: 0.2 + i / Math.max(1, card.spark.length) * 0.75 }} />)}</div>}</motion.section>)}</div>
      <div className={s.tabRow}><nav aria-label="Analytics sections">{tabs.map(value => <button key={value} aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>{value}</button>)}</nav><button className={s.viewToggle} aria-pressed={table} onClick={() => setTable(value => !value)}>{table ? <FiBarChart2 /> : <FiTable />}{table ? "Chart view" : "Table view"}</button></div>
      {tab === "Overview" && <>
        <div className={s.sectionTitle}><span>01 / PERFORMANCE</span><h2>The momentum behind the rides.</h2></div>
        <div className={s.grid}>
          <ChartCard wide title="Revenue over time" subtitle="Gross USD received · payment date, with legacy update-date proxy" badge="COLLECTED"><div className={s.chartHeadline}><strong>{money(data.metrics.revenue)}</strong><span>Avg. payment <b>{money(data.metrics.averagePayment)}</b></span></div>{chart([], "area", { monetary: true, height: 300, categories: chartDates, series: [{ name: "Collected revenue", data: data.timeline.map(row => row.revenue) }] })}</ChartCard>
          <ChartCard title="Request outcomes" subtitle="Current status of requests created in this period">{chart(data.statuses, "donut")}</ChartCard>
          <ChartCard wide title="Ride demand" subtitle="Requests and riders by request creation date" badge="DEMAND">{chart([], "area", { categories: chartDates, series: [{ name: "Requests", data: data.timeline.map(row => row.requests) }, { name: "Riders", data: data.timeline.map(row => row.riders) }] })}</ChartCard>
          <ChartCard title="From request to ride" subtitle="Current progression of this period’s request cohort">{chart(data.pipeline, "bar", { horizontal: true })}</ChartCard>
          <ChartCard title="Estimated booking mix" subtitle="Requested item values · includes unpaid and closed requests">{chart(data.estimateMix, "donut", { monetary: true })}</ChartCard>
          <ChartCard title="Rider completion" subtitle="Participants invited for this period’s requests">{chart(data.riderProgress, "bar", { horizontal: true })}</ChartCard>
          <ChartCard title="Payment sources" subtitle="Number of USD payments received in this period">{chart(data.paymentSources, "donut")}</ChartCard>
        </div>
        <div className={s.insightStrip}><FiZap /><div><span>THE NEXT OPPORTUNITY</span><p><strong>{money(data.details.outstanding)}</strong> in unpaid participant balances for this period’s accepted requests.</p></div><Link href="/bookings">Open bookings <FiArrowUpRight /></Link></div>
      </>}
      {tab === "Rides & demand" && <>
        <div className={s.sectionTitle}><span>02 / RIDING BEHAVIOR</span><h2>Know what riders are looking for.</h2></div><div className={s.grid}>
          <ChartCard wide title="When requests come in" subtitle="Request creation · weekday and four-hour blocks · Pacific time" badge="ACTIVITY MAP"><DemandHeatmap data={data.heatmap} table={table} /></ChartCard>
          <ChartCard title="Group size" subtitle="Number of riders per submitted request">{chart(data.groupSizes, "donut")}</ChartCard>
          <ChartCard title="Trip duration" subtitle="Consecutive ride days per request">{chart(data.durations)}</ChartCard>
          <ChartCard title="Booking lead time" subtitle="Time between request creation and first ride day">{chart(data.leadTimes)}</ChartCard>
          <ChartCard title="Gear preference" subtitle="Rider selections across this period’s requests">{chart(data.gear, "donut")}</ChartCard>
          <ChartCard wide title="Track demand" subtitle="Requested groups per track · all request statuses">{chart(data.tracks, "bar", { horizontal: true, height: 300 })}</ChartCard>
          <ChartCard title="Demand by weekday" subtitle="Request creation day · Pacific time">{chart(data.heatmap.map(row => ({ label: row.name, value: row.data.reduce((total, cell) => total + cell.y, 0) })), "radar")}</ChartCard>
        </div>
      </>}
      {tab === "Customers & engagement" && <>
        <div className={s.sectionTitle}><span>03 / YOUR COMMUNITY</span><h2>From curious to committed.</h2></div>
        <div className={s.statStrip}><div><strong>{data.metrics.customers}</strong><span>new customers</span></div><div><strong>{data.details.signups}</strong><span>email captures</span></div><div><strong>{data.details.inquiries}</strong><span>contact inquiries</span></div><div><strong>{data.details.reviews ? data.details.averageRating.toFixed(1) : "—"}<small> / 5</small></strong><span>average review rating</span></div></div>
        <div className={s.grid}>
          <ChartCard wide title="Audience growth & interest" subtitle="New accounts, email captures, and inquiries by creation date">{chart([], "area", { categories: chartDates, series: [{ name: "Customers", data: data.timeline.map(row => row.customers) }, { name: "Email captures", data: data.timeline.map(row => row.signups) }, { name: "Inquiries", data: data.timeline.map(row => row.inquiries) }] })}</ChartCard>
          <ChartCard title="Email verification" subtitle="Current verification status of new customer accounts">{chart(data.verification, "donut")}</ChartCard>
          <ChartCard wide title="Where new customers are" subtitle="Country / state from account profiles · top 8">{chart(data.geographies, "bar", { horizontal: true })}</ChartCard>
          <ChartCard title="Request frequency" subtitle="Unique organizers · requests within this period">{chart(data.frequency, "donut")}</ChartCard>
          <ChartCard title="What’s on their mind" subtitle="Contact form inquiry topics">{chart(data.topics, "bar", { horizontal: true })}</ChartCard>
          <ChartCard title="Review ratings" subtitle="All reviews submitted in this period · rounded to nearest star">{chart(data.ratings, "bar", { horizontal: true })}</ChartCard>
          <ChartCard title="Review moderation" subtitle="Current status of reviews submitted in this period">{chart(data.reviewStatus, "donut")}</ChartCard>
        </div>
      </>}
      {tab === "Fleet & coaching" && <>
        <div className={s.sectionTitle}><span>04 / THE RIDING EXPERIENCE</span><h2>The machines. The people. The demand.</h2></div><div className={s.grid}>
          <ChartCard wide title="Most requested bikes" subtitle="Rider bike selections · top 10 · all request statuses" badge="FLEET DEMAND">{chart(data.bikes, "bar", { horizontal: true, height: 330 })}</ChartCard>
          <ChartCard title="Fleet readiness" subtitle="Current inventory snapshot · number of listings">{chart(data.inventory, "donut")}</ChartCard>
          <ChartCard wide title="Coaching demand" subtitle="Coach assignments · shared coach counts once per group">{chart(data.coaches, "bar", { horizontal: true, height: 300 })}</ChartCard>
          <ChartCard title="Coaching attachment" subtitle="Share of requests selecting any coach">{data.metrics.requests ? chart([{ label: "Requests with coaching", value: data.details.coachedRequests / data.metrics.requests * 100 }], "radialBar") : chart([])}</ChartCard>
          <ChartCard wide title="Bike demand footprint" subtitle="Relative share of bike selections · top 10">{chart(data.bikes, "treemap", { height: 280 })}</ChartCard>
          <ChartCard title="Stock by category" subtitle={`${data.details.inventoryUnits} units · current inventory snapshot`}>{chart(data.stock, "bar", { horizontal: true })}</ChartCard>
        </div>
      </>}
      <footer className={s.notes}><div><FiActivity /><strong>Real data. Clear definitions.</strong></div><p>Revenue is gross USD received before refunds, processing fees, and costs. Ride payments use the payment date; legacy rentals use the last update date because no payment timestamp is stored. Inventory reservation rows are excluded from revenue. Request charts include every status and use requests created in the selected period; status and completion reflect their current state. Inventory shows the current snapshot.</p><p>Comparison: {data.range.previousStart} to {data.range.previousEnd}. Updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: data.timeZone }).format(new Date(data.generatedAt))} Pacific. Refresh to retrieve the latest data.</p></footer>
    </div>}
  </div>;
}
