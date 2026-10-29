export type Breakdown = { label: string; value: number }[];
export type AnalyticsMetrics = { revenue: number; requests: number; riders: number; customers: number; payments: number; averagePayment: number; approvalRate: number };
export type AnalyticsData = {
  range: { start: string; end: string; days: number; previousStart: string; previousEnd: string; today: string };
  generatedAt: string; timeZone: string; currency: string;
  metrics: AnalyticsMetrics; previous: AnalyticsMetrics;
  timeline: { date: string; revenue: number; requests: number; riders: number; customers: number; inquiries: number; signups: number }[];
  statuses: Breakdown; pipeline: Breakdown; riderProgress: Breakdown; groupSizes: Breakdown; bikes: Breakdown;
  tracks: Breakdown; coaches: Breakdown; estimateMix: Breakdown; gear: Breakdown; durations: Breakdown;
  leadTimes: Breakdown; geographies: Breakdown; verification: Breakdown; frequency: Breakdown; topics: Breakdown;
  ratings: Breakdown; reviewStatus: Breakdown; inventory: Breakdown; stock: Breakdown; paymentSources: Breakdown;
  heatmap: { name: string; data: { x: string; y: number }[] }[];
  details: { outstanding: number; reviews: number; averageRating: number; inquiries: number; signups: number; inventoryUnits: number; coachedRequests: number };
};
export async function getAnalytics(query: string, signal?: AbortSignal): Promise<AnalyticsData> {
  const response = await fetch(`/api/admin/analytics?${query}`, { cache: "no-store", signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Unable to load analytics.");
  return result;
}
