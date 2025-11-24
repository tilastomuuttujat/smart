// infograph.js

export function createInfograph(containerEl){
  containerEl.innerHTML = "";

  const info = document.createElement("div");
  info.style.fontSize = "12px";
  info.style.color = "#e0d7c7";
  info.textContent = "Infografiikka-moduuli odottaa valittua kirjoitusta…";
  containerEl.appendChild(info);

  function setEssay(essayId){
    if(!essayId){
      info.textContent = "Infografiikka-moduuli: ei valittua kirjoitusta.";
    }else{
      info.textContent = `Infografiikka-moduuli: tässä voisi näkyä kirjoituksen ${essayId} infografiikka.`;
    }
  }

  return { setEssay };
}
