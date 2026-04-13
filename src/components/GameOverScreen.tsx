import type { Player } from "../types";
import PlayersContainer from "./PlayersContainer";

interface GameOverScreenProps {
  players: Player[];
  onReset: () => void;
}

export default function GameOverScreen({ players, onReset }: GameOverScreenProps) {
  const maxScore = Math.max(...players.map((p) => p.timeline.length - 1));
  const winnerSet = new Set(
    players.filter((p) => p.timeline.length - 1 === maxScore).map((p) => p.name),
  );

  return (
    <div id="game" className="screen">
      <h2 className="splash-title">Game Over!</h2>
      <p>Winner{winnerSet.size > 1 ? "s" : null}:</p>
      <div className="game-over-scores">
        {players
          .slice()
          .sort((a, b) => b.timeline.length - a.timeline.length)
          .map((p) => (
            <div
              key={p.name}
              className={`game-over-player${winnerSet.has(p.name) ? " game-over-winner" : ""}`}
            >
              {winnerSet.has(p.name) && <span>🏆 </span>}
              <span>{p.name}</span>
              <span className="game-over-player-score">{p.timeline.length - 1}</span>
            </div>
          ))}
      </div>
      <button onClick={onReset}>Play Again</button>
      <PlayersContainer
        players={players}
        currentPlayerIndex={-1}
        hasCurrentSong={false}
        endCondition={{ type: "infinite", value: 0 }}
        onPlaceSong={() => {}}
        disabled={true}
      />
    </div>
  );
}
