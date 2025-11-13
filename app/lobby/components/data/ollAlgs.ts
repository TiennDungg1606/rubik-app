export type AlgItem = {
  id: number;
  name: string;
  alg: string;
  img?: string;
  altAlgs?: string[];
};

export const ollAlgs: AlgItem[] = [
  {
    id: 1,
    name: "1. Dot",
    alg: "R 2U' 2R' F R F' U2 (R' F R F')",
    img: "/practice/oll1.png"
  },
  {
    id: 2,
    name: "2. Dot",
    alg: "r U r' U2 r U2 R' U2 R U' r'",
    img: "/practice/oll2.png"
  },
  {
    id: 3,
    name: "3. Dot",
    alg: "r' R2 U R' U r 2U' r' U M'",
    img: "/practice/oll3.png"
  },
  {
    id: 4,
    name: "4. Dot",
    alg: "M U' r U2 r' U' R U' R' M'",
    img: "/practice/oll4.png"
  },
  {
    id: 5,
    name: "5. Square",
    alg: "r' U2' R U R' U r",
    img: "/practice/oll5.png"
  },
  {
    id: 6,
    name: "6. Square",
    alg: "r U2' R' U' R U' r'",
    img: "/practice/oll6.png"
  },
  {
    id: 7,
    name: "7. Lightning",
    alg: "r U R' U R U2 r'",
    img: "/practice/oll7.png"
  },
  {
    id: 8,
    name: "8. Lightning",
    alg: "1. l' U' L U' L' U2 l",
    img: "/practice/oll8.png",
    altAlgs: ["2. y2 r' U' R U' R' U2' r"]
  },
  {
    id: 9,
    name: "9. Fish",
    alg: "(R U R' U') R' F R2 U R' U' F'",
    img: "/practice/oll9.png"
  },
  {
    id: 10,
    name: "10. Fish",
    alg: "R U R' U (R' F R F') R U2 R'",
    img: "/practice/oll10.png"
  },
  {
    id: 11,
    name: "11. Lightning",
    alg: "r' R2 U R' U R U2' R' U M'",
    img: "/practice/oll11.png"
  },
  {
    id: 12,
    name: "12. Lightning",
    alg: "M' R' U' R U' R' U2 R U' R r'",
    img: "/practice/oll12.png"
  },
  {
    id: 13,
    name: "13. Knight",
    alg: "F U R 2U' R' U' R U R' F'",
    img: "/practice/oll13.png"
  },
  {
    id: 14,
    name: "14.Knight",
    alg: "R' F R U R' F' R F U' F'",
    img: "/practice/oll14.png"
  },
  {
    id: 15,
    name: "15. Knight",
    alg: "r' U' r R' U' R U r' U r",
    img: "/practice/oll15.png"
  },
  {
    id: 16,
    name: "16. Knight",
    alg: "r U r' (R U R' U') r U' r'",
    img: "/practice/oll16.png"
  },
  {
    id: 17,
    name: "17. Dot",
    alg: "R U R' U (R' F R F') U2 (R' F R F')",
    img: "/practice/oll17.png"
  },
  {
    id: 18,
    name: "18. Dot",
    alg: "r U R' U R U2' r2' U' R U' R' U2' r",
    img: "/practice/oll18.png"
  },
  {
    id: 19,
    name: "19. Dot",
    alg: "r' R U (R U R' U') r 2R' F R F'",
    img: "/practice/oll19.png"
  },
  {
    id: 20,
    name: "20. Dot",
    alg: "r U R' U' M2' U R U' R' U' M'",
    img: "/practice/oll20.png"
  },
  {
    id: 21,
    name: "21. EO",
    alg: "R 2U' R' U' R U R' U' R U' R'",
    img: "/practice/oll21.png"
  },
  {
    id: 22,
    name: "22. EO",
    alg: "R 2U' (2R' U' R2 U' 2R') U2 R",
    img: "/practice/oll22.png"
  },
  {
    id: 23,
    name: "23. EO",
    alg: "1. ↑ R2 D' R 2U' R' D R 2U' R",
    img: "/practice/oll23.png",
    altAlgs: ["2. y2 R2 D R' U2 R D' R' U2 R'"]
  },
  {
    id: 24,
    name: "24. EO",
    alg: "r U R' U' r' F R F'",
    img: "/practice/oll24.png"
  },
  {
    id: 25,
    name: "25. EO",
    alg: "F' r U R' U' r' F R",
    img: "/practice/oll25.png"
  },
  {
    id: 26,
    name: "26. EO",
    alg: "(R 2U' R') U' R U' R'",
    img: "/practice/oll26.png"
  },
  {
    id: 27,
    name: "27. EO",
    alg: "R U R' U R 2U' R'",
    img: "/practice/oll27.png"
  },
  {
    id: 28,
    name: "28. CO",
    alg: "r U R' U' r' R U R U' R'",
    img: "/practice/oll28.png"
  },
  {
    id: 29,
    name: "29. Awkward",
    alg: "1. (R U R' U') R U' ⭣ R' F' U' F R U R'",
    img: "/practice/oll29.png",
    altAlgs: ["2. (R U R' U')(R' F R F')(R U R' U') M' U R U' r'"]
  },
  {
    id: 30,
    name: "30. Awkward",
    alg: "↓ F U R 2U' R' U' R 2U' R' U' F'",
    img: "/practice/oll30.png"
  },
  {
    id: 31,
    name: "31. P",
    alg: "R' U' F U R U' R' F' R",
    img: "/practice/oll31.png"
  },
  {
    id: 32,
    name: "32. P",
    alg: "S (R U R' U') R' F R f'",
    img: "/practice/oll32.png"
  },
  {
    id: 33,
    name: "33. T",
    alg: "(R U R' U')(R' F R F')",
    img: "/practice/oll33.png"
  },
  {
    id: 34,
    name: "34. C",
    alg: "1. (R U R' U')(R' F R F') R' U2' R U R'U R",
    img: "/practice/oll34.png",
    altAlgs: ["2. ↓ F R U R' U' R' F' r U R U' r'"]
  },
  {
    id: 35,
    name: "35. Fish",
    alg: "R U2' R2' F R F' R U2' R'",
    img: "/practice/oll35.png"
  },
  {
    id: 36,
    name: "36. W",
    alg: "1. L' U' L U' L' U L U L F' L' F",
    img: "/practice/oll36.png",
    altAlgs: ["2. y2 R' U' R U' R' U R U l U' R' U"]
  },
  {
    id: 37,
    name: "37. Fish",
    alg: "↓ F R U' R' U' R U R' F'",
    img: "/practice/oll37.png"
  },
  {
    id: 38,
    name: "38. W",
    alg: "R U R' U R U' R' U' R' F R F'",
    img: "/practice/oll38.png"
  },
  {
    id: 39,
    name: "39. Lightning",
    alg: "R U R' F' U' F U R U2' R'",
    img: "/practice/oll39.png"
  },
  {
    id: 40,
    name: "40. Lightning",
    alg: "R' F (R U R' U') F' U R",
    img: "/practice/oll40.png"
  },
  {
    id: 41,
    name: "41. Awkward",
    alg: "R U R' U R U2' R' F (R U R' U') F'",
    img: "/practice/oll41.png"
  },
  {
    id: 42,
    name: "42. Awkward",
    alg: "1. R' U' R U' R' U2' R ↓ F (R U R' U') F'",
    img: "/practice/oll42.png",
    altAlgs: ["2. R' U' R U' R' U2' R U R' F' U' F U R"]
  },
  {
    id: 43,
    name: "43. P",
    alg: "R' U' F' U F R",
    img: "/practice/oll43.png"
  },
  {
    id: 44,
    name: "44. P",
    alg: "1. ↓ F U R U' R' F'",
    img: "/practice/oll44.png",
    altAlgs: ["2. y2 ↓ f (R U R' U') f'"]
  },
  {
    id: 45,
    name: "45. T",
    alg: "↓ F R U R' U' F'",
    img: "/practice/oll45.png"
  },
  {
    id: 46,
    name: "46. C Shape",
    alg: "R' U' ↑ R' F R F' U R",
    img: "/practice/oll46.png"
  },
  {
    id: 47,
    name: "47. L",
    alg: "R' U' ⭡ (R' F R F')(R' F R F') U R",
    img: "/practice/oll47.png"
  },
  {
    id: 48,
    name: "48. L",
    alg: "↓ F (R U R' U')(R U R' U') F'",
    img: "/practice/oll48.png"
  },
  {
    id: 49,
    name: "49. L",
    alg: "r U' r2' U r2 U r2' U' r",
    img: "/practice/oll49.png"
  },
  {
    id: 50,
    name: "50. L",
    alg: "r' U r2 U' r2' U' r2 U r'",
    img: "/practice/oll50.png"
  },
  {
    id: 51,
    name: "51. Line",
    alg: "⭣ F (U R U' R')(U R U' R') F'",
    img: "/practice/oll51.png"
  },
  {
    id: 52,
    name: "52. Line",
    alg: "R' F' U' F U' R U R' U R",
    img: "/practice/oll52.png"
  },
  {
    id: 53,
    name: "53. L",
    alg: "r' U2' (R U R' U') R U R' U r",
    img: "/practice/oll53.png"
  },
  {
    id: 54,
    name: "54. L",
    alg: "r U2' R' U' (R U R' U') R U' r'",
    img: "/practice/oll54.png"
  },
  {
    id: 55,
    name: "55. Line",
    alg: "r U2' R' U' r' R2 U R' U' r U' R'",
    img: "/practice/oll55.png"
  },
  {
    id: 56,
    name: "56. Line",
    alg: "r U r' U R U' R' U R U' R' r U' r'",
    img: "/practice/oll56.png"
  },
  {
    id: 57,
    name: "57. CO",
    alg: "R U R' U' M' U R U' r'",
    img: "/practice/oll57.png"
  }
];
