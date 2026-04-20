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
  2:  3,
  3:  5,
  4:  7,
  5:  9,
  6:  11,
  7:  13,
  8:  11,
  9:  9,
  10: 7,
  11: 5,
  12: 3,
};

export const MAX_TRACK = 13; // horse 7's track length (widest column)
export const SCRATCH_SLOTS = 4;

export function penaltyFor(scratchIndex, baseBet) {
  return (scratchIndex + 1) * baseBet;
}
