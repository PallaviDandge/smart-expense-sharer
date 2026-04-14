function parseRupeesToPaise(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, frac = ""] = s.split(".");
  const paise = `${frac}00`.slice(0, 2);
  return BigInt(rupees) * 100n + BigInt(paise);
}

function paiseToRupeesString(paise) {
  const n = typeof paise === "bigint" ? paise : BigInt(paise);
  const sign = n < 0n ? "-" : "";
  const abs = n < 0n ? -n : n;
  const rupees = abs / 100n;
  const p = abs % 100n;
  return `${sign}${rupees.toString()}.${p.toString().padStart(2, "0")}`;
}

module.exports = { parseRupeesToPaise, paiseToRupeesString };

