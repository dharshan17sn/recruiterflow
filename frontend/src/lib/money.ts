/**
 * Parses a rupee currency string into an integer paise amount without floating-point math.
 * Accepts up to 2 decimal places. Returns null for invalid or negative inputs.
 */
export function parseRupeesToPaise(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  // Remove valid commas (e.g., 1,00,000.00)
  const sanitized = trimmed.replace(/,/g, '');

  // Must be non-negative digits with up to 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    return null;
  }

  const parts = sanitized.split('.');
  const wholePart = parts[0];
  if (wholePart === undefined) {
    return null;
  }

  const whole = parseInt(wholePart, 10);
  if (!Number.isSafeInteger(whole)) {
    return null;
  }

  let paise = whole * 100;
  const fracPart = parts[1];
  if (fracPart !== undefined) {
    if (fracPart.length === 1) {
      paise += parseInt(fracPart, 10) * 10;
    } else if (fracPart.length === 2) {
      paise += parseInt(fracPart, 10);
    } else {
      return null;
    }
  }

  return paise;
}

/**
 * Formats an integer paise value into an Indian Rupee formatted string with Indian grouping.
 * Examples:
 *   10000000 -> "₹1,00,000.00"
 *   0 -> "₹0.00"
 *   -50000 -> "-₹500.00"
 */
export function formatINR(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const fraction = absPaise % 100;
  const fracStr = fraction < 10 ? '0' + fraction.toString() : fraction.toString();
  const rStr = rupees.toString();

  let grouped: string;
  if (rStr.length <= 3) {
    grouped = rStr;
  } else {
    const last3 = rStr.slice(-3);
    const rest = rStr.slice(0, -3);
    const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = restGrouped + ',' + last3;
  }

  return (isNegative ? '-₹' : '₹') + grouped + '.' + fracStr;
}

