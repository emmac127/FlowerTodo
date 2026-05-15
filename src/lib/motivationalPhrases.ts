export const MOTIVATIONAL_PHRASES = [
  'Great job!',
  "I'm proud of you!",
  'You did it! ✿',
  'Amazing work!',
  'So wonderful!',
  'Keep it up!',
  'You’re blooming!',
  'Fantastic!',
  'Way to go!',
  'Super cute effort!',
  'Believe in yourself!',
  'One step closer!',
] as const;

export function pickMotivationalPhrase(exclude?: string): string {
  const pool = exclude
    ? MOTIVATIONAL_PHRASES.filter((p) => p !== exclude)
    : [...MOTIVATIONAL_PHRASES];
  return pool[Math.floor(Math.random() * pool.length)] ?? MOTIVATIONAL_PHRASES[0];
}
