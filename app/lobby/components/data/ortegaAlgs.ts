import { type AlgItem } from "./ollAlgs";

export const ortegaOllAlgs: AlgItem[] = [
  { id: 1, name: "H", alg: "R2 U2 R U2 R2", img: "/practice/ortega-oll-h.png" },
  { id: 2, name: "Pi", alg: "R U2' R2' U' R2 U' R2' U2' R", img: "/practice/ortega-oll-pi.png" },
  { id: 3, name: "Antisune", alg: "R U2 R' U' R U' R'", img: "/practice/ortega-oll-antisune.png" },
  { id: 4, name: "Sune", alg: "R U R' U R U2 R'", img: "/practice/ortega-oll-sune.png" },
  { id: 5, name: "L", alg: "F R' F' R U R U' R'", img: "/practice/ortega-oll-l.png" },
  { id: 6, name: "T", alg: "R U R' U' R' F R F'", img: "/practice/ortega-oll-t.png" },
  { id: 7, name: "U", alg: "F R U R' U' F'", img: "/practice/ortega-oll-u.png" }
];

export const ortegaPblAlgs: AlgItem[] = [
  { id: 1, name: "Adj/Adj", alg: "R2 U' B2 U2 R2 U' R2", img: "/practice/ortega-pbl-adj-adj.png" },
  { id: 2, name: "Adj/Diag", alg: "R U' R F2 R' U R'", img: "/practice/ortega-pbl-adj-diag.png" },
  { id: 3, name: "Diag/Adj", alg: "y R2' U R2 U' R2' U R2 U' R2'", img: "/practice/ortega-pbl-diag-adj.png" },
  { id: 4, name: "Diag/Diag", alg: "R2 F2 R2", img: "/practice/ortega-pbl-diag-diag.png" },
  { id: 5, name: "Adj U", alg: "R U R' U' R' F R2 U' R' U' R U R' F'", img: "/practice/ortega-pbl-adj-u.png" },
  { id: 6, name: "Diag U", alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", img: "/practice/ortega-pbl-diag-u.png" }
];
