function riderItems(request, index) {
  const rider = request.draft.riders[index];
  return request.estimate.items.filter(item => item.coachId
    ? request.draft.coachMode === "individual" ? item.coachId === rider.coachId : index === 0
    : item.riderIndex === index);
}
function splitAmounts(request) {
  const amounts = request.draft.riders.map((_, index) => riderItems(request, index).reduce((sum, item) => sum + (item.included ? 0 : item.amount), 0));
  if (amounts.some(amount => !Number.isSafeInteger(amount) || amount < 0 || amount > 99999999) || amounts.reduce((a, b) => a + b, 0) !== request.estimate.totalAmount) throw new Error("Rider amounts do not match the booking estimate.");
  return amounts;
}
module.exports = { riderItems, splitAmounts };
