exports.measurements = body => {
  const data = {};
  for (const [key, label, min, max] of [["heightCm", "height in cm", 30, 300], ["weightKg", "weight in kg", 1, 500]]) {
    if (body[key] === undefined) continue;
    const value = typeof body[key] === "string" ? body[key].trim() : body[key];
    if (value === "" || value === null) { data[key] = null; continue; }
    if (!["string", "number"].includes(typeof value) || !/^\d+(?:\.\d)?0*$/.test(String(value)) || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) return { error: `Enter your ${label} between ${min} and ${max}, with at most one decimal place, or leave it blank.` };
    data[key] = Number(value);
  }
  return { data };
};
