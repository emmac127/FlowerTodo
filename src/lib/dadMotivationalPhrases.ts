export const DAD_MOTIVATIONAL_PHRASES = [
  "You're a star!",
  'I can astro-NOT believe you did that!',
  'Shoot for the moon!',
  'Simply LEM-sational!',
  "Wow, you're out of this world!",
  "You're a stellar dad!",
  'Emma says she loves you and is super impressed!',
] as const;

export function pickDadMotivationalPhrase(exclude?: string): string {
  const pool = DAD_MOTIVATIONAL_PHRASES.filter((p) => p !== exclude);
  const choices = pool.length > 0 ? pool : [...DAD_MOTIVATIONAL_PHRASES];
  return choices[Math.floor(Math.random() * choices.length)]!;
}
