import { useEffect, useRef, useState } from "react";

interface Props {
  data: number[];
  title: string;
  duration: number;
  audioUrl: string;
}

const Waveform = ({ data, title, duration, audioUrl }: Props) => {
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const width = 600;
  const height = 300;
  const centerY = height / 2;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  if (!data || data.length === 0) return null;

  const validData = data.filter((val) => !isNaN(val) && isFinite(val));
  if (validData.length === 0) return null;

  const min = Math.min(...validData);
  const max = Math.max(...validData);

  const range = max - min;
  const scaleY = height * 0.45;

  const pathData = validData
    .map((sample, i) => {
      const x = (i / (validData.length - 1)) * width;
      let y = centerY;

      if (range > 0) {
        const normalizedSample = (sample - min) / range;
        y = centerY - (normalizedSample - 0.5) * 2 * scaleY;
      }

      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const cursorX = progressRatio * width;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block max-h-[300px] max-w-full rounded border border-stone-200"
        >
          <path
            d={`M 0 ${centerY} H ${width}`}
            stroke="#e7e5e4"
            strokeWidth="1"
          />
          <path
            d={pathData}
            fill="none"
            stroke="#44403c"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line
            x1={cursorX}
            y1={0}
            x2={cursorX}
            y2={height}
            stroke="red"
            strokeWidth="2"
          />
        </svg>
      </div>
      <p className="mt-2 text-center text-xs text-stone-500">{title}</p>

      <audio ref={audioRef} controls src={audioUrl} className="mt-3 w-full" />
    </div>
  );
};

export default Waveform;
