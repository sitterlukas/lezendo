// French/UIAA grades in ascending difficulty order — used to sort the grade
// breakdown and pick the hardest send. Ported from the web statistics client.
const gradeOrder = [
  "3",
  "3+",
  "4a",
  "4b",
  "4c",
  "5a",
  "5b",
  "5c",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
  "8a+",
  "8b",
  "8b+",
  "8c",
  "8c+",
  "9a",
  "9a+",
  "9b",
  "9b+",
  "9c",
];

export function gradeRank(grade: string): number {
  return gradeOrder.indexOf(grade.trim().toLowerCase());
}

// The hardest of a set of grades by the known order; falls back to the first
// entry when none match (unknown grade format).
export function hardestGrade(grades: string[]): string | null {
  if (grades.length === 0) return null;
  let best: string | null = null;
  let bestRank = -2;
  for (const g of grades) {
    const r = gradeRank(g);
    if (r > bestRank) {
      bestRank = r;
      best = g;
    }
  }
  return best ?? grades[0];
}

// Sort grade rows hardest-first; unknown grades fall to the end alphabetically.
export function sortGradesByDifficulty<T extends { grade: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ra = gradeRank(a.grade);
    const rb = gradeRank(b.grade);
    if (ra !== -1 && rb !== -1) return rb - ra;
    if (ra !== -1) return -1;
    if (rb !== -1) return 1;
    return a.grade.localeCompare(b.grade);
  });
}
