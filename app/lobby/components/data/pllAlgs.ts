import { type AlgItem } from "./ollAlgs";

export const pllAlgs: AlgItem[] = [
  {
    id: 1,
    name: "Ua Perm",
    alg: "M2' U M U2 M' U M2'",
    img: "/practice/pll-ua.png"
  },
  {
    id: 2,
    name: "Ub Perm",
    alg: "M2' U' M U2 M' U' M2'",
    img: "/practice/pll-ub.png"
  },
  {
    id: 3,
    name: "Ga Perm",
    alg: "↓ R2 U R' U R' U' R U' R2' (U' D) ↑ R' U R D'",
    img: "/practice/pll-ga.png"
  },
  {
    id: 4,
    name: "Gb Perm",
    alg: "R' U' R (U D') ↓ R2 U R' U R U' R U' R2' D",
    img: "/practice/pll-gb.png"
  },
  {
    id: 5,
    name: "Gc Perm",
    alg: "↑ R2' U' R U' R U R' U ↑ R2' (U D') R U' R' D",
    img: "/practice/pll-gc.png"
  },
  {
    id: 6,
    name: "Gd Perm",
    alg: "↓ R U R' (U' D) R2 U' R U' R' U R' U R2 D'",
    img: "/practice/pll-gd.png"
  },
  {
    id: 7,
    name: "Ra Perm",
    alg: "1. R U' R' U' R U R D R' U' R D' R' U2 R'",
    img: "/practice/pll-ra.png",
    altAlgs: ["2. y' R U R' F' R U2' R' U2' R' F R U R U2' R'"]  
  },
  {
    id: 8,
    name: "Rb Perm",
    alg: "R' U2' R U2' R' F R U R' U' R' F' R2",
    img: "/practice/pll-rb.png"
  },
  {
    id: 9,
    name: "Ja Perm",
    alg: "x R2 F R F' R U2 r' U r U2",
    img: "/practice/pll-ja.png"
  },
  {
    id: 10,
    name: "Jb Perm",
    alg: "R U R' F' R U R' U' R' F R2 U' R' U'",
    img: "/practice/pll-jb.png"
  },
  {
    id: 11,
    name: "Na Perm",
    alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
    img: "/practice/pll-na.png"
  },
  {
    id: 12,
    name: "Nb Perm",
    alg: "R' U R U' R' F' U' F R U R' F ↑ R' F' R U' R",
    img: "/practice/pll-nb.png"
  },
  {
    id: 13,
    name: "T Perm",
    alg: "R U R' U' R' F R2 U' R' U' R U R' F'",
    img: "/practice/pll-t.png"
  },
  {
    id: 14,
    name: "V Perm",
    alg: "1. R' U R' U' y R' F' R2 U' R' U R' F R F",
    img: "/practice/pll-v.png",
    altAlgs: ["2. R' U R U' R' f' U' R U2' R' U' R U' R' f R"]
  },
  {
    id: 15,
    name: "Y Perm",
    alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    img: "/practice/pll-y.png"
  },
  {
    id: 16,
    name: "H Perm",
    alg: "M2' U M2' U2 M2' U M2'",
    img: "/practice/pll-h.png"
  },
  {
    id: 17,
    name: "Z Perm",
    alg: "M' U M2' U M2' U M' U2' M2' U'",
    img: "/practice/pll-z.png"
  },
  {
    id: 18,
    name: "Aa Perm",
    alg: "x R' U R' D2 R U' R' D2 R2 x'",
    img: "/practice/pll-aa.png"
  },
  {
    id: 19,
    name: "Ab Perm",
    alg: "x' R U' R D2 R' U R D2 R2 x",
    img: "/practice/pll-ab.png"
  },
  {
    id: 20,
    name: "E Perm",
    alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
    img: "/practice/pll-e.png"
  },
  {
    id: 21,
    name: "F Perm",
    alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
    img: "/practice/pll-f.png"
  }
];
