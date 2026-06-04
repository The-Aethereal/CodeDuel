export function computeStreak(acceptedDates: string[]): number {
  if (acceptedDates.length === 0) return 0;

  const uniqueDays = new Set(
    acceptedDates.map((d) => {
      const date = new Date(d);
      return date.toISOString().split('T')[0];
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Streak must include today or yesterday to be active
  if (!uniqueDays.has(todayStr) && !uniqueDays.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  const cursor = uniqueDays.has(todayStr) ? today : yesterday;

  while (true) {
    const dayStr = cursor.toISOString().split('T')[0];
    if (!uniqueDays.has(dayStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
