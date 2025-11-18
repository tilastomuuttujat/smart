import os
import re

# ---- ASETUS: MUUTA TÄMÄ TARVITTAESSA ----
INPUT_MD = "kokoelma.md"  # Markdown-tiedoston nimi a-Shellin Documents-kansiossa
OUTPUT_DIR = "texts"      # Kansio, johon yksittäiset kirjoitukset tallennetaan
# ----------------------------------------


def make_safe_filename(title: str, max_len: int = 50) -> str:
    """
    Muodostaa otsikosta tiedostonimeen sopivan "slug"-tekstin.
    Poistaa hankalat merkit, korvaa välilyönnit alaviivalla.
    """
    # Korvaa välilyönnit alaviivalla
    slug = title.strip().replace(" ", "_")
    # Poista sellaiset merkit, jotka helposti sotkevat tiedostonimiä
    slug = re.sub(r'[\\/*?:"<>|]', "", slug)
    # Lyhennä tarvittaessa
    if len(slug) > max_len:
        slug = slug[:max_len]
    return slug


def main():
    if not os.path.exists(INPUT_MD):
        print(f"Tiedostoa '{INPUT_MD}' ei löytynyt. Varmista nimi ja sijainti.")
        return

    with open(INPUT_MD, "r", encoding="utf-8") as f:
        raw = f.read()

    # Normalisoi rivinvaihdot
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")

    # Pilkotaan markdown otsikoiden "## " mukaan.
    # Käytetään regexiä: rivejä, jotka alkavat '## '.
    parts = re.split(r"(?m)^##\s+", raw)

    # Ensimmäinen osa voi olla mahdollista "alkutekstiä" ennen ensimmäistä otsikkoa.
    # Jätetään se pois, jos siinä ei ole merkittävää sisältöä.
    sections = []
    for part in parts:
        if part.strip():
            sections.append(part)

    if not sections:
        print("Otsikoituja osioita ei löytynyt. Varmista, että otsikot alkavat riveiltä '## '.")
        return

    # Luodaan ulostulokansio
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    count = 0

    for i, sec in enumerate(sections, start=1):
        lines = sec.strip().split("\n")
        if not lines:
            continue

        # Ensimmäinen rivi on otsikko
        title = lines[0].strip()
        body_lines = lines[1:]
        body = "\n".join(body_lines).strip()

        # Varotoimi: jos otsikko on tyhjä, ohitetaan
        if not title:
            continue

        count += 1
        file_id = f"{count:03d}"
        safe_title = make_safe_filename(title)
        filename = f"{OUTPUT_DIR}/{file_id}_{safe_title}.txt"

        # Sisältöön mukaan myös otsikko, jotta konteksti säilyy
        content_parts = [f"## {title}"]
        if body:
            content_parts.append("")
            content_parts.append(body)
        content = "\n".join(content_parts).strip() + "\n"

        with open(filename, "w", encoding="utf-8") as out:
            out.write(content)

        print(f"Luo: {filename}")

    print(f"\nValmis. Luotiin {count} kirjoitusta kansioon '{OUTPUT_DIR}/'.")


if __name__ == "__main__":
    main()
