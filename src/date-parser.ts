const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function parseDate(input: string): string {
  const trimmed = input.trim().toLowerCase();

  // Already ISO — pass through
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return input.trim();
  }

  const now = new Date();

  if (trimmed === 'today') {
    return formatDate(now);
  }

  if (trimmed === 'tomorrow') {
    now.setDate(now.getDate() + 1);
    return formatDate(now);
  }

  // +Nd or +Nw pattern
  const relativeMatch = trimmed.match(/^\+(\d+)([dw])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    now.setDate(now.getDate() + (unit === 'w' ? amount * 7 : amount));
    return formatDate(now);
  }

  // "next monday", "next friday", etc.
  const nextDayMatch = trimmed.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1]);
    if (targetDay !== -1) {
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      now.setDate(now.getDate() + daysUntil);
      return formatDate(now);
    }
  }

  // Fallback: return as-is (let the API validate)
  return input.trim();
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00+0000`;
}
