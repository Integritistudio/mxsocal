exports.receiptData = ({ request, kind, riderIndex }) => {
  const buddy = kind === "buddy";
  const riders = request.draft.riders.map((rider, index) => ({ rider, index })).filter(row => !buddy || row.index === riderIndex);
  if (!riders.length) throw new Error("Receipt rider is missing.");
  const sections = riders.map(({ rider, index }) => ({ name: buddy ? "Your selections" : rider.name, contact: buddy ? "" : [rider.email, rider.phone].filter(Boolean).join(" / "), items: request.estimate.items.filter(item => item.riderIndex === index && !item.coachId) }));
  const coaches = request.estimate.items.filter(item => item.coachId && (!buddy || (request.draft.coachMode === "individual" ? item.coachId === riders[0].rider.coachId : item.coachId === request.draft.coachId))).map(item => buddy ? { ...item, assignmentLabel: request.draft.coachMode === "individual" ? "Your coach" : "Whole group" } : item);
  return { buddy, sections, coaches, items: [...sections.flatMap(section => section.items), ...coaches] };
};
