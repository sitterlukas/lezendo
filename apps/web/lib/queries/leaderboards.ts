import { periodStart, type Period, type Discipline } from "@whipperbook/core";
import { loadLeaderboard } from "@/lib/points";

export type LeaderboardRow = {
  user_id: number;
  name: string;
  avatar_url: string | null;
  points: number;
};

export type LeaderboardData = {
  viewerId: number | null;
  rows: LeaderboardRow[];
  myRow: { rank: number; total: number } | null;
};

// Top 25 climbers for a period + discipline, plus the viewer's own rank when
// they're outside the top 25.
export async function getLeaderboard(
  period: Period,
  discipline: Discipline,
  viewerId: number | null,
): Promise<LeaderboardData> {
  const start = periodStart(period);
  const all = await loadLeaderboard({ start, discipline });
  const rows = all.slice(0, 25);

  let myRow: { rank: number; total: number } | null = null;
  if (viewerId && !rows.some((r) => r.user_id === viewerId)) {
    const idx = all.findIndex((r) => r.user_id === viewerId);
    if (idx >= 0) myRow = { rank: idx + 1, total: all[idx].points };
  }

  return { viewerId, rows, myRow };
}
