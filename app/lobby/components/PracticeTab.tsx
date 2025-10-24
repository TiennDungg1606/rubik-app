// PracticeTab.tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function PracticeTab() {
  const router = useRouter();
  // Danh mục và subcategory
  const categories = [
    { name: "3x3", sub: ["OLL", "PLL"] },
    { name: "2x2", sub: ["Ortega", "CLL"] },
    { name: "4x4", sub: ["Parity", "OLL"] },
  ];

  // State chọn danh mục và sub
  const [selectedCat, setSelectedCat] = React.useState("3x3");
  const [selectedSub, setSelectedSub] = React.useState("OLL");

  // Công thức mẫu cho OLL 3x3
  const ollAlgs = [
    {
      id: 1,
      name: "1. Dot",
      alg: "R 2U' 2R' F R F' U2 R' F R F'",
      img: "/practice/oll1.png"
    },
    {
      id: 10,
      name: "10. Fish",
      alg: "R U R' U R' F R F' R U2 R'",
      img: "/practice/oll10.png"
    },
    {
      id: 11,
      name: "11. Lightning",
      alg: "r U R' U R' F R F' R U2 r'",
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
      alg: "l' U' l L' U' L U l' U l",
      img: "/practice/oll15.png"
    },
    {
      id: 16,
      name: "16. Knight",
      alg: "r U r' R U R' U' r U' r'",
      img: "/practice/oll16.png"
    },
    {
      id: 17,
      name: "17. Dot",
      alg: "y2 R U R' U R' F U2 R' F",
      img: "/practice/oll17.png"
    },
    {
      id: 18,
      name: "18. Dot",
      alg: "r U R' U R U2 r' r' U' R U' R' U2 r",
      img: "/practice/oll18.png"
    },
    {
      id: 19,
      name: "19. Dot",
      alg: "r' R U (R U R' U') r 2R' F R F'",
      img: "/practice/oll19.png"
    },
    {
      id: 2,
      name: "2. Dot",
      alg: "r U r' U2 r U2 R' U2 R U' r'",
      img: "/practice/oll2.png"
    },
    {
      id: 20,
      name: "20. Dot",
      alg: "r U R' U' M2 U R U' R' U' M'",
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
      alg: "↑ R2 D' R 2U' R' D R 2U' R",
      img: "/practice/oll23.png"
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
      alg: "R U R' U' R U' ↓ R' F' U' F R U R'",
      img: "/practice/oll29.png"
    },
    {
      id: 3,
      name: "3. Dot",
      alg: "r' R2 U R' U r 2U' r' U M'",
      img: "/practice/oll3.png"
    },
    {
      id: 30,
      name: "30. Awkward",
      alg: "↓ F U R 2U' R' U' R 2U' R' U' F'",
      img: "/practice/oll30.png"
    },
    {
      id: 31,
      name: "31",
      alg: "R' U' F U R U' R' F' R",
      img: "/practice/oll31.png"
    },
    {
      id: 32,
      name: "32",
      alg: "L U F' U' L' U L F L'",
      img: "/practice/oll32.png"
    },
    {
      id: 33,
      name: "33",
      alg: "R U R' U' R' F R F'",
      img: "/practice/oll33.png"
    },
    {
      id: 34,
      name: "34",
      alg: "R U R2 U' R' F R U R U' F'",
      img: "/practice/oll34.png"
    },
    {
      id: 35,
      name: "35",
      alg: "R U2 R' R' F R F' R U2 R'",
      img: "/practice/oll35.png"
    },
    {
      id: 36,
      name: "36",
      alg: "L' U' L U' L' U L U L F' L' F",
      img: "/practice/oll36.png"
    },
    {
      id: 37,
      name: "37",
      alg: "F R' F' R U R U' R'",
      img: "/practice/oll37.png"
    },
    {
      id: 38,
      name: "38",
      alg: "R U R' U R U' R' U' R' F R F'",
      img: "/practice/oll38.png"
    },
    {
      id: 39,
      name: "39",
      alg: "L F' L' U' L U F U' L'",
      img: "/practice/oll39.png"
    },
    {
      id: 4,
      name: "4",
      alg: "M U' r U2 r' U' R U' R' M'",
      img: "/practice/oll4.png"
    },
    {
      id: 40,
      name: "40",
      alg: "R' F R U R' U' F' U R",
      img: "/practice/oll40.png"
    },
    {
      id: 41,
      name: "41",
      alg: "R U R' U R U2 R' F R U R' U' F'",
      img: "/practice/oll41.png"
    },
    {
      id: 42,
      name: "42",
      alg: "R' U' R U' R' U2 R F R U R' U' F'",
      img: "/practice/oll42.png"
    },
    {
      id: 43,
      name: "43",
      alg: "F' U' L' U L F",
      img: "/practice/oll43.png"
    },
    {
      id: 44,
      name: "44. P",
      alg: "↓ F U R U' R' F'",
      img: "/practice/oll44.png"
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
      name: "47",
      alg: "R' U' R' F R F' R' F R F' U R",
      img: "/practice/oll47.png"
    },
    {
      id: 48,
      name: "48",
      alg: "F R U R' U' R U R' U' F'",
      img: "/practice/oll48.png"
    },
    {
      id: 49,
      name: "49",
      alg: "r U' r2 U r2 U r2 U' r",
      img: "/practice/oll49.png"
    },
    {
      id: 5,
      name: "5",
      alg: "l' U2 L U L' U l",
      img: "/practice/oll5.png"
    },
    {
      id: 50,
      name: "50",
      alg: "r' U r2 U' r2 U' r2 U r'",
      img: "/practice/oll50.png"
    },
    {
      id: 51,
      name: "51",
      alg: "F U R U' R' U R U' R' F'",
      img: "/practice/oll51.png"
    },
    {
      id: 52,
      name: "52",
      alg: "R U R' U R U' B U' B' R'",
      img: "/practice/oll52.png"
    },
    {
      id: 53,
      name: "53",
      alg: "l' U2 L U L' U' L U L' U l",
      img: "/practice/oll53.png"
    },
    {
      id: 54,
      name: "54",
      alg: "(r U2 R' U') R U R' U' R U' r'",
      img: "/practice/oll54.png"
    },
    {
      id: 55,
      name: "55. Line",
      alg: "R' F R U R U' R2 F' R2 U' R' U R U R'",
      img: "/practice/oll55.png"
    },
    {
      id: 56,
      name: "56. Line",
      alg: "(r' U' r) U' R' U R U' R' U R r' U r",
      img: "/practice/oll56.png"
    },
    {
      id: 57,
      name: "57. H Shape",
      alg: "R U R' U' M' U R U' r'",
      img: "/practice/oll57.png"
    },
    {
      id: 6,
      name: "6",
      alg: "r U2 R' U' R U' r'",
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
      alg: "l' U' L U' L' U2 l",
      img: "/practice/oll8.png"
    },
    {
      id: 9,
      name: "9. Fish",
      alg: "R U R' U' R' F R2 U R' U' F'",
      img: "/practice/oll9.png"
    },
  ];

  // Hiển thị công thức theo danh mục và sub
  let algs: typeof ollAlgs = [];
  if (selectedCat === "3x3" && selectedSub === "OLL") {
    algs = ollAlgs;
  }
  // Các trường hợp khác sẽ cập nhật sau

  return (
    <div className="w-full max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <select
          className="bg-gray-800 text-white rounded px-3 py-1"
          value={selectedCat}
          onChange={e => {
            setSelectedCat(e.target.value);
            // Reset sub khi đổi danh mục
            setSelectedSub(categories.find(c => c.name === e.target.value)?.sub[0] || "");
          }}
        >
          {categories.map((cat) => (
            <option key={cat.name}>{cat.name}</option>
          ))}
        </select>
        <select
          className="bg-gray-800 text-white rounded px-3 py-1"
          value={selectedSub}
          onChange={e => setSelectedSub(e.target.value)}
        >
          {(categories.find(c => c.name === selectedCat)?.sub || []).map((sub) => (
            <option key={sub}>{sub}</option>
          ))}
        </select>
      </div>
      {/* Alg List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {algs.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-8 text-lg">Sẽ cập nhật sau...</div>
        ) : (
          algs.map((alg) => (
            <div key={alg.id} className="bg-gray-900 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between shadow-lg">
              <div className="flex-1">
                <div className="text-lg font-bold mb-1">{alg.name}</div>
                <div className="text-base font-mono mb-2 whitespace-pre-wrap">{alg.alg}</div>
                <div className="flex gap-2 mt-2">
                                     <button
                     className="bg-blue-600 text-white px-3 py-1 rounded"
                     onClick={() => {
                       // Chuyển hướng sang trang practice timer với thông tin OLL
                       router.push(`/practice-timer?alg=${encodeURIComponent(alg.alg)}&name=${encodeURIComponent(alg.name)}`);
                     }}
                   >
                     Start Training
                   </button>
                 </div>
               </div>
               <img src={alg.img} alt="alg" className="w-24 h-24 object-contain ml-4" />
             </div>
           ))
         )}
       </div>
     </div>
   );
 }
