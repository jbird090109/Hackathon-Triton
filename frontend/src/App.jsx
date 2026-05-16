import { useState } from "react";

function App() {
  const [players, setPlayers] = useState(["", "", ""]);
  const [category, setCategory] = useState("Trivia");
  const [match, setMatch] = useState(null);
  const [winner, setWinner] = useState("");

  const challenges = {
    Trivia: [
      "Answer 3 general knowledge questions. Most correct wins.",
      "Name as many countries as you can in 30 seconds.",
      "Guess the movie from one quote.",
    ],
    Physical: [
      "Do the most jumping jacks in 20 seconds.",
      "Hold a plank longer than your opponent.",
      "Balance on one foot the longest.",
    ],
    "Video Games": [
      "Win a 1v1 mini-game round.",
      "Get the highest score in one attempt.",
      "Complete a level faster than your opponent.",
    ],
    Acting: [
      "Act out a movie scene. Judge picks the better performance.",
      "Do your best celebrity impression.",
      "Improvise a dramatic scene using a random object.",
    ],
  };

  const updatePlayer = (index, value) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const startChallenge = () => {
    if (players.some((p) => p.trim() === "")) {
      alert("Please enter all 3 player names.");
      return;
    }

    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const randomChallenge =
      challenges[category][
        Math.floor(Math.random() * challenges[category].length)
      ];

    setMatch({
      competitor1: shuffled[0],
      competitor2: shuffled[1],
      judge: shuffled[2],
      challenge: randomChallenge,
      roomName: `challenge-room-${Date.now()}`,
    });

    setWinner("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "white",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          textAlign: "center",
          marginBottom: "10px",
        }}
      >
        Challenge Connect
      </h1>

      <p
        style={{
          color: "#94a3b8",
          textAlign: "center",
          fontSize: "18px",
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        Randomly connect people online for live challenges with two competitors
        and one judge.
      </p>

      <div
        style={{
          width: "380px",
          margin: "40px auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <input
          type="text"
          placeholder="Person 1 username"
          value={players[0]}
          onChange={(e) => updatePlayer(0, e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Person 2 username"
          value={players[1]}
          onChange={(e) => updatePlayer(1, e.target.value)}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Person 3 username"
          value={players[2]}
          onChange={(e) => updatePlayer(2, e.target.value)}
          style={inputStyle}
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option>Trivia</option>
          <option>Physical</option>
          <option>Video Games</option>
          <option>Acting</option>
        </select>

        <button onClick={startChallenge} style={primaryButtonStyle}>
          Find Random Challenge Match
        </button>
      </div>

      {match && (
        <div
          style={{
            backgroundColor: "#1e293b",
            width: "560px",
            margin: "0 auto",
            padding: "26px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <h2>{category} Challenge Match</h2>

          <p>
            <strong>Competitor 1:</strong> {match.competitor1}
          </p>

          <p>
            <strong>Competitor 2:</strong> {match.competitor2}
          </p>

          <p>
            <strong>Judge:</strong> {match.judge}
          </p>

          <h3 style={{ marginTop: "24px" }}>Challenge</h3>

          <p style={{ color: "#cbd5e1", fontSize: "17px" }}>
            {match.challenge}
          </p>

          <a
            href={`https://meet.jit.si/${match.roomName}`}
            target="_blank"
            rel="noreferrer"
          >
            <button style={videoButtonStyle}>Join Video Room</button>
          </a>

          <h3 style={{ marginTop: "24px" }}>Judge Picks Winner</h3>

          <button
            onClick={() => setWinner(match.competitor1)}
            style={winnerButtonStyle}
          >
            {match.competitor1}
          </button>

          <button
            onClick={() => setWinner(match.competitor2)}
            style={winnerButtonStyle}
          >
            {match.competitor2}
          </button>

          {winner && (
            <h2 style={{ marginTop: "22px", color: "#22c55e" }}>
              Winner: {winner}
            </h2>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  borderRadius: "8px",
  border: "none",
  fontSize: "16px",
};

const primaryButtonStyle = {
  padding: "14px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
};

const videoButtonStyle = {
  padding: "13px 20px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
  marginTop: "12px",
};

const winnerButtonStyle = {
  padding: "11px 16px",
  margin: "8px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

export default App;