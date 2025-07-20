// lib/scramble.ts
// Function to generate WCA-standard 3x3 Rubik's Cube scramble using the scrambler library
// If not installed: npm install scrambler


// Get standard scramble from cubing.net API (cstimer does not have an official public API)
// API: https://scramble.cubing.net/api/v0/scramble/333
export async function fetchWcaScramble(): Promise<string> {
  const res = await fetch("https://scramble.cubing.net/api/v0/scramble/333");
  if (!res.ok) throw new Error("Failed to fetch scramble");
  const data = await res.json();
  return data.scramble;
}
