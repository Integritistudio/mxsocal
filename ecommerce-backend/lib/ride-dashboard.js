// One request is one group ride. Reservation rows are inventory holds, not sales.
function summarizeRides(requests, participants, today) {
  const byRequest = new Map();
  let collectedCents = 0, paidRiders = 0;
  for (const participant of participants) {
    const rows = byRequest.get(participant.requestId) || [];
    rows.push(participant); byRequest.set(participant.requestId, rows);
    if (participant.paidAt) { collectedCents += Number(participant.amountCents); paidRiders++; }
  }
  let pendingRequests = 0, requestedCents = 0, pendingPaymentRequests = 0, partiallyPaidRequests = 0, outstandingCents = 0, unpaidRiders = 0, waiversPending = 0, approvedRequests = 0, todaysRides = 0, completedRides = 0;
  const upcoming = [];
  for (const request of requests) {
    const riders = byRequest.get(request.id) || [];
    const expectedRiders = Number(request.riderCount);
    const paid = riders.filter(r => r.paidAt), signed = riders.filter(r => r.signedAt);
    const amountPaid = paid.reduce((sum, r) => sum + Number(r.amountCents), 0);
    if (request.status === "requested" && !request.expiredAt && request.startDate >= today) {
      pendingRequests++; requestedCents += Number(request.estimatedCents || 0);
    }
    if (request.status === "pending_payment") {
      pendingPaymentRequests++;
      outstandingCents += Math.max(0, Number(request.estimatedCents || 0) - amountPaid);
      unpaidRiders += Math.max(0, expectedRiders - paid.length);
      waiversPending += Math.max(0, expectedRiders - signed.length);
      if (amountPaid > 0 && paid.length < expectedRiders) partiallyPaidRequests++;
    }
    const confirmed = request.status === "approved" && expectedRiders > 0 && riders.length === expectedRiders && paid.length === expectedRiders && signed.length === expectedRiders;
    if (!confirmed) continue;
    approvedRequests++;
    if (request.endDate < today) { completedRides++; continue; }
    if (request.startDate <= today) todaysRides++;
    upcoming.push({ ...request, amountPaidCents: amountPaid });
  }
  upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  return { collectedCents, paidRiders, pendingRequests, requestedCents, pendingPaymentRequests, partiallyPaidRequests, outstandingCents, unpaidRiders, waiversPending, approvedRequests, todaysRides, completedRides, upcoming };
}
module.exports = { summarizeRides };
