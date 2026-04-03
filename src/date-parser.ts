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

  if (trimmed === 'yesterday') {
    now.setDate(now.getDate() - 1);
    return formatDate(now);
  }

  // "end of week" — upcoming Sunday (last day of current week)
  if (trimmed === 'end of week' || trimmed === 'eow') {
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    now.setDate(now.getDate() + daysUntilSunday);
    return formatDate(now);
  }

  // "end of month" — last day of current month
  if (trimmed === 'end of month' || trimmed === 'eom') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return formatDate(lastDay);
  }

  // +Nd or +Nw pattern
  const relativeMatch = trimmed.match(/^\+(\d+)([dw])$/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    now.setDate(now.getDate() + (unit === 'w' ? amount * 7 : amount));
    return formatDate(now);
  }

  // "in N hours/days/weeks"
  const inMatch = trimmed.match(/^in\s+(\d+)\s+(hour|hours|day|days|week|weeks)$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    if (unit.startsWith('hour')) {
      now.setHours(now.getHours() + amount);
      return formatDateTime(now);
    } else if (unit.startsWith('day')) {
      now.setDate(now.getDate() + amount);
      return formatDate(now);
    } else if (unit.startsWith('week')) {
      now.setDate(now.getDate() + amount * 7);
      return formatDate(now);
    }
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

  // "friday 5pm", "monday 9:30am", etc.
  const dayTimeMatch = trimmed.match(/^(\w+)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (dayTimeMatch) {
    const dayName = dayTimeMatch[1];
    const targetDay = DAY_NAMES.indexOf(dayName);
    if (targetDay !== -1) {
      let hours = parseInt(dayTimeMatch[2], 10);
      const minutes = dayTimeMatch[3] ? parseInt(dayTimeMatch[3], 10) : 0;
      const ampm = dayTimeMatch[4];
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0) daysUntil += 7;
      // If same day but time already past, move to next week
      if (daysUntil === 0) {
        const targetTime = new Date(now);
        targetTime.setHours(hours, minutes, 0, 0);
        if (targetTime <= now) daysUntil = 7;
      }
      now.setDate(now.getDate() + daysUntil);
      now.setHours(hours, minutes, 0, 0);
      return formatDateTime(now);
    }
  }

  // Bare day name: "friday", "monday", etc. — next occurrence
  const bareDay = DAY_NAMES.indexOf(trimmed);
  if (bareDay !== -1) {
    const currentDay = now.getDay();
    let daysUntil = bareDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    now.setDate(now.getDate() + daysUntil);
    return formatDate(now);
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

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}:00+0000`;
}
