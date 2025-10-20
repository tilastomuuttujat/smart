import React, { useEffect, useState } from "react";

function Visualization({ visualization }) {
  if (!visualization) return null;
  // Yksinkertainen visualisointi (esim. näytä data JSON-muodossa)
  return (
    <div>
      <strong>Visualisointi:</strong>
      <pre>{JSON.stringify(visualization, null, 2)}</pre>
    </div>
  );
}

function Writing({ writing }) {
  return (
    <div style={{border: "1px solid #ddd", margin: "1em", padding: "1em"}}>
      <h2>{writing.title}</h2>
      <div><strong>Luokka:</strong> {writing.category}</div>
      <div><strong>Avainsanat:</strong> {writing.keywords}</div>
      <div dangerouslySetInnerHTML={{ __html: writing.content_html }} />
      <div>
        <strong>Infografiikka:</strong>
        <br />
        <img src={writing.infographic} alt="Infografiikka" width={150} />
      </div>
      <div><strong>Lähteet:</strong> {writing.sources.join(", ")}</div>
      <div><strong>Analyysi:</strong> {writing.analysis}</div>
      <Visualization visualization={writing.visualization} />
    </div>
  );
}

export default function App() {
  const [writings, setWritings] = useState([]);

  useEffect(() => {
    fetch("writings.json")
      .then(res => res.json())
      .then(data => setWritings(data))
      .catch(err => console.error("Tietojen lataus epäonnistui:", err));
  }, []);

  return (
    <div>
      <h1>Kirjoitusten tietokanta</h1>
      {writings.map(writing => (
        <Writing key={writing.id} writing={writing} />
      ))}
    </div>
  );
}
