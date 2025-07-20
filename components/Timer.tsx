"use client"

import { useEffect, useRef, useState } from "react";

function formatTime(ms: number) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const msR = ms % 1000;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${msR.toString().padStart(3, "0")}`;
}

export default function Timer() {
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    const handleSpace = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!running) {
          setRunning(true);
          intervalRef.current = setInterval(() => {
            setTimer(t => t + 10);
          }, 10);
        } else {
          setRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    };
    window.addEventListener("keydown", handleSpace);
    return () => {
      window.removeEventListener("keydown", handleSpace);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleReset = () => {
    setRunning(false);
    setTimer(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="text-6xl font-mono text-white bg-black px-8 py-4 rounded-lg shadow-lg mb-2">
        {formatTime(timer)}
      </div>
      <button
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition-colors"
        onClick={handleReset}
      >
        Reset
      </button>
      <div className="text-gray-400 text-sm">Press <span className="font-bold">Space</span> to start/stop</div>
    </div>
  );
}
