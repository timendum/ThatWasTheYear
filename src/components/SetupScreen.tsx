import { useState, useEffect, useRef, KeyboardEvent } from "react";
import type { EndCondition } from "../types";

interface SetupScreenProps {
  onStartGame: (playerNames: string[], endCondition: EndCondition) => void;
  initialPlayers: string[];
  initialEndCondition: EndCondition;
}

export default function SetupScreen({
  onStartGame,
  initialPlayers,
  initialEndCondition,
}: SetupScreenProps) {
  const [players, setPlayers] = useState(initialPlayers.length ? initialPlayers : ["", ""]);
  const [endType, setEndType] = useState<EndCondition["type"]>(initialEndCondition.type);
  const [turnsValue, setTurnsValue] = useState(initialEndCondition.value);
  const [correctSongsValue, setCorrectSongsValue] = useState(initialEndCondition.value);

  const justAddedRef = useRef(false);

  function addPlayer() {
    setPlayers([...players, ""]);
    justAddedRef.current = true;
  }

  useEffect(() => {
    if (justAddedRef.current) {
      justAddedRef.current = false;
      const inputs = document.querySelectorAll<HTMLInputElement>(".p-name");
      for (const input of inputs) {
        if (input.value === "") {
          input.focus();
          break;
        }
      }
    }
  }, [players.length]);

  function updatePlayer(index: number, value: string) {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  }

  function handlePlayerKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === players.length - 1) {
        document.querySelector<HTMLButtonElement>(".start-btn")?.focus();
      } else {
        document.querySelectorAll<HTMLInputElement>(".p-name")[index + 1]?.focus();
      }
    }
  }

  function handleStart() {
    const names = players.map((p) => p.trim()).filter((n) => n !== "");
    if (names.length === 0) {
      alert("Enter at least one name.");
      return;
    }
    const value =
      endType === "turns" ? turnsValue : endType === "correctSongs" ? correctSongsValue : 0;
    onStartGame(names, { type: endType, value });
  }

  return (
    <div className="screen">
      <h1 className="splash-title">That Was The Year</h1>
      <div className="player-inputs-title">Players:</div>
      <div id="player-inputs">
        {players.map((name, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Player ${i + 1}`}
            className="p-name"
            value={name}
            onChange={(e) => updatePlayer(i, e.target.value)}
            onKeyDown={(e) => handlePlayerKeyDown(e, i)}
            tabIndex={0}
          />
        ))}
      </div>
      <button onClick={addPlayer} tabIndex={0}>
        + Add Player
      </button>
      <div className="end-condition-title">End Condition:</div>
      <div id="end-condition">
        <label className="end-condition-option">
          <input
            type="radio"
            name="endCondition"
            value="infinite"
            checked={endType === "infinite"}
            onChange={() => setEndType("infinite")}
            tabIndex={0}
          />
          <span>Infinite (until songs run out)</span>
        </label>
        <label className="end-condition-option">
          <input
            type="radio"
            name="endCondition"
            value="turns"
            checked={endType === "turns"}
            onChange={() => setEndType("turns")}
            tabIndex={0}
          />
          <span>
            Number of turns per player:{" "}
            <input
              className="end-condition-value"
              type="number"
              min="1"
              value={turnsValue}
              onChange={(e) => setTurnsValue(Number(e.target.value))}
              tabIndex={0}
            />
          </span>
        </label>
        <label className="end-condition-option">
          <input
            type="radio"
            name="endCondition"
            value="correctSongs"
            checked={endType === "correctSongs"}
            onChange={() => setEndType("correctSongs")}
            tabIndex={0}
          />
          <span>
            First to reach:{" "}
            <input
              className="end-condition-value"
              type="number"
              min="1"
              value={correctSongsValue}
              onChange={(e) => setCorrectSongsValue(Number(e.target.value))}
              tabIndex={0}
            />{" "}
            correct songs
          </span>
        </label>
      </div>
      <button className="start-btn" onClick={handleStart} tabIndex={0}>
        Start Game
      </button>
      <p className="cookie-notice">
        This game uses Apple Music data to provide song previews and metadata. By clicking
        "Start Game", you agree to Apple's{" "}
        <a
          href="https://www.apple.com/legal/privacy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>{" "}
        and the use of necessary cookies for playback functionality.
      </p>
    </div>
  );
}
