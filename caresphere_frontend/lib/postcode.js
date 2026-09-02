const FULL_UK_POSTCODE =
  /^(?:GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKSTUW]? ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

export function normalisePostcode(value) {
  const compact = String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "");

  if (compact.length < 5) {
    return compact;
  }

  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isFullUkPostcode(value) {
  return FULL_UK_POSTCODE.test(normalisePostcode(value));
}
