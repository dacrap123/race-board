export const HORSES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const HORSE_COLORS = {
  2:  '#e74c3c', // red
  3:  '#e67e22', // orange
  4:  '#f1c40f', // yellow
  5:  '#2ecc71', // green
  6:  '#1abc9c', // teal
  7:  '#3498db', // blue
  8:  '#9b59b6', // purple
  9:  '#e91e63', // pink
  10: '#795548', // brown
  11: '#607d8b', // slate
  12: '#263238', // dark charcoal
};

// Steps each horse needs to reach its finish line.
// Mirrors the physical board's pyramid shape — horse 7 needs the most rolls.
export const TRACK_LENGTHS = {
  // Values include the separate finish spot. The holes between start and
  // finish are 2, 5, 8, 11, 14, 16, then symmetric back down.
  2:  3,
  3:  6,
  4:  9,
  5:  12,
  6:  15,
  7:  17,
  8:  15,
  9:  12,
  10: 9,
  11: 6,
  12: 3,
};

export const MAX_TRACK = 17; // 16 holes plus the separate finish spot
export const SCRATCH_SLOTS = 4;

export function penaltyFor(scratchIndex, baseBet) {
  return (scratchIndex + 1) * baseBet;
}
