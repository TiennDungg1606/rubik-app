export function generateWcaScramble() {
  try {
    // Dynamically require or import scrambler only when function is called
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const scrambler = require('scrambler');
    if (scrambler && typeof scrambler.cube === 'function') {
      return scrambler.cube();
    }
    if (scrambler && scrambler.default && typeof scrambler.default.cube === 'function') {
      return scrambler.default.cube();
    }
  } catch (e) {
    // ignore
  }
  // fallback: static scramble if library fails
  return 'R U R\' U R U2 R\' U\' F2 D2 B2';
}
