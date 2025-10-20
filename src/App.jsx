import React, { useEffect, useState } from "react";

export default function App() {
  const [writings, setWritings] = useState([]);
  const [infographics, setInfographics] = useState([]);
  const [visualizations, setVisualizations] = useState([]);

  useEffect(() => {
    fetch("data/writings.json")
      .then(res => res.json())
      .then(setWritings);
    fetch("data/infographics.json")
      .then(res => res.json())
      .then(setInfographics);
    fetch("data/visualizations.json")
      .then(res => res.json())
      .then(setVisualizations);
  }, []);

  return (
    <div>
      <h1>Kirjoitusten tietokanta</h1>
      {writings.map(writing => (
        <div key={writing.id} style={{border: "1px solid #ddd", margin: "1em", padding: "1em"}}>
          <h2>{writing.title}</h2>
          <div><strong>Luokka:</strong> {writing.category}</div>
          <div><strong>Avainsanat:</strong> {writing.keywords}</div>
          <div dangerouslySetInnerHTML={{ __html: writing.content_html }} />
          {/* Infografiikat, jos writing.id löytyy infographics-tiedostosta */}
          <div>
            <strong>Infografiikka:</strong>
            <ul>
              {infographics
                .filter(info => info.writing_id === writing.id)
                .map(info => (
                  <li key={info.id}>
                    <img src={info.image_url} alt={info.description} width={150} />
                    <div>{info.description}</div>
                  </li>
                ))
              }
            </ul>
          </div>
          {/* Visualisoinnit, jos writing.id löytyy visualizations-tiedostosta */}
          <div>
            <strong>Visualisoinnit:</strong>
            <ul>
              {visualizations
                .filter(viz => viz.writing_id === writing.id)
                .map(viz => (
                  <li key={viz.id}>
                    <div>{viz.viz_type}</div>
                    <pre>{viz.viz_data}</pre>
                    <div>{viz.description}</div>
                  </li>
                ))
              }
            </ul>
          </div>
          <div><strong>Lähteet:</strong> {Array.isArray(writing.sources) ? writing.sources.join(", ") : writing.sources}</div>
          <div><strong>Analyysi:</strong> {writing.analysis}</div>
        </div>
      ))}
    </div>
  );
}
