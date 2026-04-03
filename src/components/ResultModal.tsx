import { useEffect, useRef, KeyboardEvent } from "react";
import type { DetailedSong } from "../types";

interface ResultModalProps {
  isCorrect: boolean;
  song: DetailedSong;
  onContinue: () => void;
}

export default function ResultModal({ isCorrect, song, onContinue }: ResultModalProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onContinue();
    }
  }

  return (
    <div id="preview-overlay" style={{ display: "flex" }}>
      <div className={`overlay-content ${isCorrect ? "" : "wrong"}`}>
        <h1 className="overlay-title">{isCorrect ? "CORRECT!" : "WRONG!"}</h1>
        <div id="reveal-card">
          <div className="card reveal-card-large">
            <a href={song.link} target="_blank" rel="noopener noreferrer" className="card-link">
              <img src={song.img} alt={song.t} />
            </a>
            <div className="year">{song.y}</div>
            <p>
              <strong>{song.t}</strong>
            </p>
            <p className="reveal-artist">{song.a}</p>
          </div>
        </div>
        <button ref={buttonRef} onClick={onContinue} onKeyDown={handleKeyDown} tabIndex={0}>
          Continue
        </button>
      </div>
    </div>
  );
}
