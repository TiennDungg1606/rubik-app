import { type AlgItem } from "./ollAlgs";
import { pllAlgs } from "./pllAlgs";

const ADJ_PARITY = "2R2 U2 2R2 Uw2 2R2";
const ADJ_PARITY_ALT = "r2 U2 r2 Uw2 r2";

export const ollParityAlgs: AlgItem[] = [
  {
    id: 1,
    name: "Basic",
    alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
    img: "/practice/oll-parity-basic.png"
  },
  {
    id: 2,
    name: "Pure",
    alg: "y2 F R U R' U' F' U Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'",
    img: "/practice/oll-parity-pure.png"
  },
  {
    id: 3,
    name: "M",
    alg: "M Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw' M'",
    img: "/practice/oll-parity-m.png"
  }
];

export const pllParityAlgs: AlgItem[] = [
  {
    id: 1,
    name: "...",
    alg: ADJ_PARITY,
    img: "/practice/pll-parity.png"
  },
  
];
