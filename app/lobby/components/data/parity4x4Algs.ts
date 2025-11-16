import { type AlgItem } from "./ollAlgs";



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
    name: "OPP Parity",
    alg: "2R2 U2 2R2 Uw2 2R2 Uw2",
    img: "/practice/pll-parity-opp.png"
  },
  {
    id: 2,
    name: "Adj Parity",
    alg: "R' U R U' 2R2 U2' 2R2 Uw2' 2R2 Uw2' U' R' U' R",
    img: "/practice/pll-parity-adj.png"
  },
  {
    id: 3,
    name: "CwO",
    alg: "u2 2R2 u2 2R2 U2 2R2 U R' U' R U' R U R U' R' U R U R2 U' R'",
    img: "/practice/pll-parity-cwo.png"
  },
  {
    id: 4,
    name: "CcwO",
    alg: "Uw2 2L2 Uw2 2L2 U2 3Rw' Rw2 R' U2 M2 U2 M' U M2 U M2",
    img: "/practice/pll-parity-ccwo.png"
  },
  {
    id: 5,
    name: "W",
    alg: "R' U R' U' R' U' R' U R U Rw2 U2 2R2 Uw2 2R2 Uw2",
    img: "/practice/pll-parity-w.png"
  },
  {
    id: 6,
    name: "Pj",
    alg: "R U R' U' R' F R2 U' R' U' R U R' F' U' 2L2 U2 2L2 Uw2 2L2 Uw2",
    img: "/practice/pll-parity-pj.png"
  },
  {
    id: 7,
    name: "Ba",
    alg: "Uw2 2L2 Uw2 2L2 U2 2L2 U R U R' F' R U R' U' R' F R2 U' R'",
    img: "/practice/pll-parity-ba.png"
  },
  {
    id: 8,
    name: "Bb",
    alg: "y x Rw2 U2 Rw2 Uw2 2R2 Uw2 B 3Rw' U R' U2 L U' R",
    img: "/practice/pll-parity-bb.png"
  },
  {
    id: 9,
    name: "Ca",
    alg: "y2 Uw2 2R2 Uw2 2R2 U2 Rw2 F R U R U' R' F' R U2 R' U2 R",
    img: "/practice/pll-parity-ca.png"
  },
  {
    id: 10,
    name: "Cb",
    alg: "y R' U2 R U2 R' F R U R' U' R' F' Rw2 U2 2R2 Uw2 2R2 Uw2",
    img: "/practice/pll-parity-cb.png"
  },
  {
    id: 11,
    name: "Da",
    alg: "R' U L' U2 R U' 3Rw B Rw2 U2 Rw2 Uw2 2R2 Uw2 x'",
    img: "/practice/pll-parity-da.png"
  },
  {
    id: 12,
    name: "Db",
    alg: "R U R' F' R U R' U' R' F R2 U' R' u2 2R2 u2 2R2 U2 2R2",
    img: "/practice/pll-parity-db.png"
  },
  {
    id: 13,
    name: "Ka",
    alg: "y 3Lw' U R' D2 R U' R' D2 x' Rw2 U2 2R2 Uw2 2R2 Uw2",
    img: "/practice/pll-parity-ka.png"
  },
  {
    id: 14,
    name: "Kb",
    alg: "r2 F2 U2 r2 R2 U2 x R' D' R U2 R' D R r2 x' U'",
    img: "/practice/pll-parity-kb.png"
  },
  {
    id: 15,
    name: "M",
    alg: "y2 Rw2 F2 U2 2R2 U R' U' R U R' D R D' R F2 U Rw2",
    img: "/practice/pll-parity-m.png"
  },
  {
    id: 16,
    name: "Pa",
    alg: "R U R' F' R U R' U' R' F R2 U' R' U' 2R2 U2 2R2 u2 2R2 u2",
    img: "/practice/pll-parity-pa.png"
  },
  {
    id: 17,
    name: "Pb",
    alg: "2R2 U2 2R2 u2 2R2 u2 R U R' F' R U R' U' R' F R2 U' R'",
    img: "/practice/pll-parity-pb.png"
  },
  {
    id: 18,
    name: "Diag C",
    alg: "F R U' R' U' R U R' F' U' 2R2 U2 2R2 u2 2R2 u2 U' R U R' U' R' F R F'",
    img: "/practice/pll-parity-diagc.png"
  },
  {
    id: 19,
    name: "Q",
    alg: "z Rw2 Uw2' R2' Uw2' F R U R' U' R U R' U' R U R' U' F' U2' R2 Uw2' Rw2' z'",
    img: "/practice/pll-parity-q.png"
  },
  {
    id: 20,
    name: "Sa",
    alg: "F R U' R' U' R U R' F' R U R' U' R' F R F' U' 2R2 U2 2R2 u2 2R2 u2",
    img: "/practice/pll-parity-sa.png"
  },
  {
    id: 21,
    name: "Sb",
    alg: "F R U' R' U' R U R' F' R U R' U' R' F R F' 2R2 U2 2R2 u2 2R2 u2",
    img: "/practice/pll-parity-sb.png"
  },
  {
    id: 22,
    name: "X",
    alg: "Rw2 F2 U2 Rw2 F' U' R' U R U' R' U R U' R' U R F R2 U2 F2 Rw2",
    img: "/practice/pll-parity-x.png"
  }
];
